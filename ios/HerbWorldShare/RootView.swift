import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            NavigationStack { BrowseView() }
                .tabItem { Label("附近物品", systemImage: "house") }
            NavigationStack { PublishView() }
                .tabItem { Label("免费发布", systemImage: "plus.circle") }
            NavigationStack { ServiceView() }
                .tabItem { Label("服务报价", systemImage: "shippingbox") }
            NavigationStack { SafetyView() }
                .tabItem { Label("安全", systemImage: "checkmark.shield") }
        }
    }
}

struct BrandHeader: View {
    let title: String
    let subtitle: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("HERBWORLD SHARE").font(.caption.weight(.bold)).tracking(2).foregroundStyle(Color("BrandGold"))
            Text(title).font(.largeTitle.bold())
            Text(subtitle).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FormSection<Content: View>: View {
    let title: String
    let help: String
    @ViewBuilder let content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.headline)
            Text(help).font(.caption).foregroundStyle(.secondary)
            content
        }
    }
}
