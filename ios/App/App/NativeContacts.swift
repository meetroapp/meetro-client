import Capacitor
import Contacts

@objc(NativeContacts)
public class NativeContacts: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeContacts"
    public let jsName = "NativeContacts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getContacts", returnType: CAPPluginReturnPromise)
    ]

    private let contactStore = CNContactStore()

    @objc public func available(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["contacts": permissionState()])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        requestContactsPermission { state in
            call.resolve(["contacts": state])
        }
    }

    @objc public func getContacts(_ call: CAPPluginCall) {
        requestContactsPermission { state in
            guard state == "granted" else {
                call.resolve([
                    "contacts": [],
                    "permission": state
                ])
                return
            }

            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let contacts = try self.readContacts()

                    DispatchQueue.main.async {
                        call.resolve([
                            "contacts": contacts,
                            "permission": "granted"
                        ])
                    }
                } catch {
                    DispatchQueue.main.async {
                        call.reject(error.localizedDescription)
                    }
                }
            }
        }
    }

    private func requestContactsPermission(_ completion: @escaping (String) -> Void) {
        let status = CNContactStore.authorizationStatus(for: .contacts)

        switch status {
        case .authorized, .limited:
            DispatchQueue.main.async {
                completion("granted")
            }
        case .denied, .restricted:
            DispatchQueue.main.async {
                completion("denied")
            }
        case .notDetermined:
            contactStore.requestAccess(for: .contacts) { granted, _ in
                DispatchQueue.main.async {
                    completion(granted ? "granted" : "denied")
                }
            }
        @unknown default:
            DispatchQueue.main.async {
                completion("prompt")
            }
        }
    }

    private func permissionState() -> String {
        switch CNContactStore.authorizationStatus(for: .contacts) {
        case .authorized, .limited:
            return "granted"
        case .denied, .restricted:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }

    private func readContacts() throws -> [[String: Any]] {
        let keys: [CNKeyDescriptor] = [
            CNContactIdentifierKey as CNKeyDescriptor,
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactOrganizationNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor,
            CNContactPostalAddressesKey as CNKeyDescriptor
        ]
        let request = CNContactFetchRequest(keysToFetch: keys)
        var contacts: [[String: Any]] = []

        try contactStore.enumerateContacts(with: request) { contact, _ in
            let displayName = self.displayName(for: contact)
            let emails = contact.emailAddresses.map { String($0.value) }

            guard !displayName.isEmpty ||
                !contact.phoneNumbers.isEmpty ||
                !contact.emailAddresses.isEmpty else {
                return
            }

            contacts.append([
                "id": contact.identifier,
                "name": displayName,
                "givenName": contact.givenName,
                "familyName": contact.familyName,
                "company": contact.organizationName,
                "phone": contact.phoneNumbers.first?.value.stringValue ?? "",
                "phones": contact.phoneNumbers.map { $0.value.stringValue },
                "email": emails.first ?? "",
                "emails": emails,
                "address": contact.postalAddresses.first.map { self.formatAddress($0.value) } ?? "",
                "source": "phone"
            ])
        }

        return contacts
    }

    private func displayName(for contact: CNContact) -> String {
        let name = [contact.givenName, contact.familyName]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        if !name.isEmpty {
            return name
        }

        return contact.organizationName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func formatAddress(_ address: CNPostalAddress) -> String {
        [
            address.street,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ]
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
        .joined(separator: ", ")
    }
}
