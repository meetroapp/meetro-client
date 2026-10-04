import Capacitor
import Foundation
import QuickLook
import UIKit

private final class MeetroPdfPreviewItem: NSObject, QLPreviewItem {
    let previewItemURL: URL?
    let previewItemTitle: String?

    init(url: URL, title: String) {
        self.previewItemURL = url
        self.previewItemTitle = title
        super.init()
    }
}

@objc(NativePdfPreview)
public class NativePdfPreview: CAPPlugin,
    CAPBridgedPlugin,
    QLPreviewControllerDataSource,
    QLPreviewControllerDelegate
{
    public let identifier = "NativePdfPreview"
    public let jsName = "NativePdfPreview"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(
            name: "preview",
            returnType: CAPPluginReturnPromise
        )
    ]

    private var activeCall: CAPPluginCall?
    private var activeDirectory: URL?
    private var activeItem: MeetroPdfPreviewItem?

    @objc public func preview(_ call: CAPPluginCall) {
        guard activeCall == nil else {
            call.reject(
                "A PDF preview is already open.",
                "PDF_PREVIEW_ALREADY_OPEN"
            )
            return
        }

        guard
            let encoded = call.getString("data"),
            let data = Data(base64Encoded: encoded),
            !data.isEmpty,
            data.count <= 50_000_000,
            data.starts(with: Data("%PDF".utf8))
        else {
            call.reject(
                "The PDF preview data is invalid.",
                "PDF_PREVIEW_INVALID_DATA"
            )
            return
        }

        let requestedName =
            call.getString("fileName") ?? "Meetro-document.pdf"

        let fileName =
            URL(fileURLWithPath: requestedName).lastPathComponent

        guard
            !fileName.isEmpty,
            fileName.lowercased().hasSuffix(".pdf")
        else {
            call.reject(
                "The PDF preview filename is invalid.",
                "PDF_PREVIEW_INVALID_FILE"
            )
            return
        }

        let suppliedTitle =
            call.getString("title")?
                .trimmingCharacters(in: .whitespacesAndNewlines)

        let title =
            (suppliedTitle?.isEmpty == false)
                ? suppliedTitle!
                : fileName.replacingOccurrences(
                    of: ".pdf",
                    with: "",
                    options: [.caseInsensitive]
                )

        let directory =
            FileManager.default.temporaryDirectory
                .appendingPathComponent(
                    "meetro-pdf-preview",
                    isDirectory: true
                )
                .appendingPathComponent(
                    UUID().uuidString,
                    isDirectory: true
                )

        let url = directory.appendingPathComponent(fileName)

        do {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true
            )

            try data.write(
                to: url,
                options: [.atomic]
            )
        } catch {
            try? FileManager.default.removeItem(at: directory)

            call.reject(
                "The PDF preview could not be prepared.",
                "PDF_PREVIEW_PREPARE_FAILED"
            )
            return
        }

        activeDirectory = directory
        activeItem = MeetroPdfPreviewItem(
            url: url,
            title: title
        )
        activeCall = call

        DispatchQueue.main.async {
            guard
                let root = self.bridge?.viewController,
                root.viewIfLoaded?.window != nil
            else {
                self.finishFailure(
                    message: "The PDF preview is unavailable.",
                    code: "PDF_PREVIEW_UNAVAILABLE"
                )
                return
            }

            let controller = QLPreviewController()
            controller.dataSource = self
            controller.delegate = self
            controller.currentPreviewItemIndex = 0

            self.presentationController(from: root).present(
                controller,
                animated: true
            )
        }
    }

    public func numberOfPreviewItems(
        in controller: QLPreviewController
    ) -> Int {
        activeItem == nil ? 0 : 1
    }

    public func previewController(
        _ controller: QLPreviewController,
        previewItemAt index: Int
    ) -> QLPreviewItem {
        if let activeItem {
            return activeItem
        }

        return NSURL(
            fileURLWithPath: "/dev/null"
        )
    }

    public func previewControllerDidDismiss(
        _ controller: QLPreviewController
    ) {
        finishSuccess()
    }

    private func presentationController(
        from root: UIViewController
    ) -> UIViewController {
        var current = root

        while let presented = current.presentedViewController {
            current = presented
        }

        return current
    }

    private func finishSuccess() {
        let call = activeCall
        cleanup()

        call?.resolve([
            "state": "dismissed"
        ])
    }

    private func finishFailure(
        message: String,
        code: String
    ) {
        let call = activeCall
        cleanup()

        call?.reject(
            message,
            code
        )
    }

    private func cleanup() {
        if let directory = activeDirectory {
            try? FileManager.default.removeItem(
                at: directory
            )
        }

        activeDirectory = nil
        activeItem = nil
        activeCall = nil
    }
}
