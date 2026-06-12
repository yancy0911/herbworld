import SwiftUI

@main
struct HerbWorldShareApp: App {
    @StateObject private var store = CommunityStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Color("BrandGold"))
        }
    }
}
