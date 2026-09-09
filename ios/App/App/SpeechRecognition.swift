import AVFoundation
import Capacitor
import Speech

@objc(SpeechRecognition)
public class SpeechRecognition: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeechRecognition"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSupportedLanguages", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise)
    ]

    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var activeCall: CAPPluginCall?
    private var inputTapInstalled = false
    private var latestMatches: [String] = []
    private var generation = 0
    private var timeout: DispatchWorkItem?
    private var interruptionObserver: NSObjectProtocol?

    @objc public func available(_ call: CAPPluginCall) {
        let locale = Locale(identifier: call.getString("language") ?? "en-US")
        let recognizer = SFSpeechRecognizer(locale: locale)
        call.resolve(["supported": recognizer != nil, "available": recognizer?.isAvailable ?? false])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(permissions())
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { _ in
            AVAudioSession.sharedInstance().requestRecordPermission { _ in
                DispatchQueue.main.async { call.resolve(self.permissions()) }
            }
        }
    }

    private func permissions() -> [String: String] {
        let speech: String
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: speech = "granted"
        case .denied, .restricted: speech = "denied"
        default: speech = "prompt"
        }
        let microphone: String
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: microphone = "granted"
        case .denied: microphone = "denied"
        default: microphone = "prompt"
        }
        // Keep the combined key compatible with existing Meetro speech consumers.
        let combined = speech == "denied" || microphone == "denied" ? "denied"
            : speech == "granted" && microphone == "granted" ? "granted" : "prompt"
        return ["speechRecognition": combined, "microphone": microphone]
    }

    @objc public func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.startRecognition(call) }
    }

    private func startRecognition(_ call: CAPPluginCall) {
        guard activeCall == nil else {
            call.reject("Speech recognition is already running.", "SPEECH_IN_PROGRESS")
            return
        }
        guard permissions()["speechRecognition"] == "granted" else {
            call.reject("Microphone and speech permission are required.", "SPEECH_PERMISSION_DENIED")
            return
        }
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: call.getString("language") ?? "en-US")) else {
            call.reject("Speech is not supported for this language.", "SPEECH_UNSUPPORTED")
            return
        }
        guard recognizer.isAvailable else {
            call.reject("Speech recognition is temporarily unavailable.", "SPEECH_UNAVAILABLE")
            return
        }

        generation += 1
        let currentGeneration = generation
        activeCall = call
        speechRecognizer = recognizer
        latestMatches = []
        let engine = AVAudioEngine()
        let request = SFSpeechAudioBufferRecognitionRequest()
        let partialResults = call.getBool("partialResults") ?? false
        let maxResults = max(1, min(call.getInt("maxResults") ?? 5, 5))
        request.shouldReportPartialResults = partialResults
        audioEngine = engine
        recognitionRequest = request
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else {
                finish(error: "The microphone audio route is unavailable.", code: "SPEECH_AUDIO_FORMAT")
                return
            }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                request.append(buffer)
            }
            inputTapInstalled = true
            recognitionTask = recognizer.recognitionTask(with: request) { result, error in
                DispatchQueue.main.async {
                    guard self.generation == currentGeneration, self.activeCall != nil else { return }
                    if let result = result {
                        self.latestMatches = result.transcriptions.prefix(maxResults).map { $0.formattedString }
                        if partialResults { self.notifyListeners("partialResults", data: ["matches": self.latestMatches]) }
                        if result.isFinal { self.finish(); return }
                    }
                    if let error = error {
                        let code = (error as NSError).domain == NSURLErrorDomain ? "SPEECH_UNAVAILABLE" : "SPEECH_RECOGNITION_FAILED"
                        self.finish(error: "Speech recognition did not complete. Please try again.", code: code)
                    }
                }
            }
            interruptionObserver = NotificationCenter.default.addObserver(
                forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
            ) { [weak self] notification in
                guard let self = self, self.generation == currentGeneration,
                      let type = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                      type == AVAudioSession.InterruptionType.began.rawValue else { return }
                self.finish(error: "Speech input was interrupted.", code: "SPEECH_INTERRUPTED")
            }
            engine.prepare()
            try engine.start()
            notifyListeners("listeningState", data: ["status": "started"])
            let deadline = DispatchWorkItem { [weak self] in
                guard let self = self, self.generation == currentGeneration else { return }
                self.finish()
            }
            timeout = deadline
            DispatchQueue.main.asyncAfter(deadline: .now() + 55, execute: deadline)
        } catch {
            finish(error: "The microphone audio session is temporarily unavailable.", code: "SPEECH_UNAVAILABLE")
        }
    }

    @objc public func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Always settle start, including when iOS never sends a final result.
            self.finish()
            call.resolve()
        }
    }

    @objc public func isListening(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["listening": self.audioEngine?.isRunning ?? false]) }
    }

    @objc public func getSupportedLanguages(_ call: CAPPluginCall) {
        call.resolve(["languages": SFSpeechRecognizer.supportedLocales().map { $0.identifier }])
    }

    private func finish(error: String? = nil, code: String? = nil) {
        guard let call = activeCall else { return }
        let matches = latestMatches
        activeCall = nil
        generation += 1 // Retire callbacks before stopping/cancelling the old session.
        timeout?.cancel()
        timeout = nil
        if let observer = interruptionObserver { NotificationCenter.default.removeObserver(observer) }
        interruptionObserver = nil
        audioEngine?.stop()
        if inputTapInstalled { audioEngine?.inputNode.removeTap(onBus: 0) }
        inputTapInstalled = false
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        speechRecognizer = nil
        recognitionRequest = nil
        audioEngine = nil
        latestMatches = []
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        notifyListeners("listeningState", data: ["status": "stopped"])
        if let error = error { call.reject(error, code) }
        else { call.resolve(["matches": matches]) }
    }
}
