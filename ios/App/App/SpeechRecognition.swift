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

    private let defaultMatches = 5
    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var activeCall: CAPPluginCall?
    private var activeCallFinished = false
    private var shouldReportPartialResults = false
    private var inputTapInstalled = false

    @objc public func available(_ call: CAPPluginCall) {
        call.resolve(["available": SFSpeechRecognizer() != nil])
    }

    @objc public func start(_ call: CAPPluginCall) {
        if audioEngine?.isRunning == true {
            call.reject("Ongoing speech recognition")
            return
        }

        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            call.reject("Missing permission")
            return
        }

        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            guard granted else {
                call.reject("User denied access to microphone")
                return
            }

            DispatchQueue.main.async {
                self.startRecognition(call)
            }
        }
    }

    @objc public func stop(_ call: CAPPluginCall) {
        stopRecognition()
        call.resolve()
    }

    @objc public func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": audioEngine?.isRunning ?? false])
    }

    @objc public func getSupportedLanguages(_ call: CAPPluginCall) {
        let languages = SFSpeechRecognizer.supportedLocales().map { $0.identifier }
        call.resolve(["languages": languages])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["speechRecognition": permissionState()])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { _ in
            AVAudioSession.sharedInstance().requestRecordPermission { _ in
                DispatchQueue.main.async {
                    call.resolve(["speechRecognition": self.permissionState()])
                }
            }
        }
    }

    private func startRecognition(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? "en-US"
        let maxResults = call.getInt("maxResults") ?? defaultMatches
        shouldReportPartialResults = call.getBool("partialResults") ?? false

        recognitionTask?.cancel()
        recognitionTask = nil
        activeCall = call
        activeCallFinished = false

        audioEngine = AVAudioEngine()
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: language))
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest?.shouldReportPartialResults = shouldReportPartialResults

        guard let audioEngine = audioEngine,
              let recognitionRequest = recognitionRequest,
              let speechRecognizer = speechRecognizer else {
            call.reject("Speech recognition unavailable")
            cleanupRecognition()
            return
        }

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, options: .defaultToSpeaker)
            try audioSession.setMode(.default)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            call.reject(error.localizedDescription)
            cleanupRecognition()
            return
        }

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { result, error in
            if let result = result {
                let matches = result.transcriptions.prefix(maxResults).map { $0.formattedString }

                if self.shouldReportPartialResults {
                    self.notifyListeners("partialResults", data: ["matches": matches])
                }

                if result.isFinal {
                    self.resolveActiveCall(["matches": matches])
                    self.cleanupRecognition()
                }
            }

            if let error = error {
                self.rejectActiveCall(error.localizedDescription)
                self.cleanupRecognition()
            }
        }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        inputTapInstalled = true

        audioEngine.prepare()

        do {
            try audioEngine.start()
            notifyListeners("listeningState", data: ["status": "started"])
        } catch {
            call.reject(error.localizedDescription)
            cleanupRecognition()
        }
    }

    private func permissionState() -> String {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            return AVAudioSession.sharedInstance().recordPermission == .denied ? "denied" : "granted"
        case .denied, .restricted:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }

    private func stopRecognition() {
        if audioEngine?.isRunning == true {
            audioEngine?.stop()
            recognitionRequest?.endAudio()
            notifyListeners("listeningState", data: ["status": "stopped"])
        }
    }

    private func resolveActiveCall(_ data: [String: Any]) {
        guard !activeCallFinished else { return }
        activeCallFinished = true
        activeCall?.resolve(data)
    }

    private func rejectActiveCall(_ message: String) {
        guard !activeCallFinished else { return }
        activeCallFinished = true
        activeCall?.reject(message)
    }

    private func cleanupRecognition() {
        if audioEngine?.isRunning == true {
            audioEngine?.stop()
            notifyListeners("listeningState", data: ["status": "stopped"])
        }
        if inputTapInstalled {
            audioEngine?.inputNode.removeTap(onBus: 0)
            inputTapInstalled = false
        }
        recognitionRequest = nil
        recognitionTask = nil
        activeCall = nil
        audioEngine = nil
        speechRecognizer = nil
    }
}
