import Capacitor
import Foundation
import StoreKit
import UIKit

@objc(StoreKitSubscriptions)
public class StoreKitSubscriptions: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitSubscriptions"
    public let jsName = "StoreKitSubscriptions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscription", returnType: CAPPluginReturnPromise)
    ]

    @objc public func available(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc public func loadProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                var result: [[String: Any]] = []
                for product in products {
                    var item: [String: Any] = [
                        "id": product.id,
                        "displayName": product.displayName,
                        "displayPrice": product.displayPrice,
                        "description": product.description
                    ]
                    if let subscription = product.subscription {
                        item["subscriptionGroupId"] = subscription.subscriptionGroupID
                        item["trialEligible"] = await subscription.isEligibleForIntroOffer
                        if let offer = subscription.introductoryOffer {
                            item["introductoryOffer"] = [
                                "paymentMode": String(describing: offer.paymentMode),
                                "periodValue": offer.period.value,
                                "periodUnit": String(describing: offer.period.unit)
                            ]
                        }
                    }
                    result.append(item)
                }
                call.resolve(["products": result])
            } catch {
                call.reject("Subscription products are unavailable.", "STOREKIT_PRODUCTS_UNAVAILABLE")
            }
        }
    }

    @objc public func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"),
              let tokenText = call.getString("appAccountToken"),
              let token = UUID(uuidString: tokenText) else {
            call.reject("The subscription request is invalid.", "STOREKIT_INVALID_REQUEST")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("This subscription is unavailable.", "STOREKIT_PRODUCT_UNAVAILABLE")
                    return
                }
                let result = try await product.purchase(options: [.appAccountToken(token)])
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "state": "verified",
                            "productId": transaction.productID,
                            "signedTransactionInfo": transaction.jwsRepresentation
                        ])
                    case .unverified:
                        call.reject("Apple could not verify this purchase.", "STOREKIT_UNVERIFIED")
                    }
                case .pending:
                    call.resolve(["state": "pending"])
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                @unknown default:
                    call.reject("The subscription could not be completed.", "STOREKIT_UNKNOWN_RESULT")
                }
            } catch {
                call.reject("The subscription could not be completed.", "STOREKIT_PURCHASE_FAILED")
            }
        }
    }

    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var transactions: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result,
                       transaction.productType == .autoRenewable {
                        transactions.append([
                            "productId": transaction.productID,
                            "signedTransactionInfo": transaction.jwsRepresentation
                        ])
                    }
                }
                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Purchases could not be restored.", "STOREKIT_RESTORE_FAILED")
            }
        }
    }

    @objc public func manageSubscription(_ call: CAPPluginCall) {
        guard let url = URL(string: "https://apps.apple.com/account/subscriptions") else {
            call.reject("Subscription management is unavailable.", "STOREKIT_MANAGE_UNAVAILABLE")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url) { opened in
                opened ? call.resolve() : call.reject("Subscription management is unavailable.", "STOREKIT_MANAGE_UNAVAILABLE")
            }
        }
    }
}
