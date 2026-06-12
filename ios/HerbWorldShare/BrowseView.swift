import SwiftUI

struct BrowseView: View {
    @EnvironmentObject private var store: CommunityStore

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 18) {
                BrandHeader(title: "曼哈顿附近免费物品", subtitle: "所有公开物品都已经过人工审核。领取前仍需自行检查。")
                if store.isLoading { ProgressView("正在读取附近物品") }
                if let error = store.errorMessage {
                    ContentUnavailableView("暂时无法读取", systemImage: "wifi.exclamationmark", description: Text(error))
                } else if store.items.isEmpty && !store.isLoading {
                    ContentUnavailableView("目前没有公开物品", systemImage: "shippingbox", description: Text("新的物品通过审核后会显示在这里。"))
                }
                ForEach(store.items) { item in
                    NavigationLink(value: item) { ItemCard(item: item) }.buttonStyle(.plain)
                }
            }.padding()
        }
        .background(Color("WarmBackground"))
        .navigationDestination(for: CommunityItem.self) { ItemDetailView(item: $0) }
        .refreshable { await store.loadItems() }
        .task { await store.loadItems() }
    }
}

struct ItemCard: View {
    let item: CommunityItem
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { Text(item.title).font(.title3.bold()); Spacer(); Text(item.condition).font(.caption).padding(7).background(.green.opacity(0.12), in: Capsule()) }
            Text(item.description).foregroundStyle(.secondary).lineLimit(3)
            Label(item.approximateArea, systemImage: "mappin.and.ellipse")
            if let dimensions = item.dimensions { Label(dimensions, systemImage: "ruler") }
            Label(item.availability, systemImage: "calendar")
        }.padding().background(.white, in: RoundedRectangle(cornerRadius: 20)).shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }
}

struct ItemDetailView: View {
    @EnvironmentObject private var store: CommunityStore
    let item: CommunityItem
    @State private var showingClaim = false
    @State private var showingReport = false
    @State private var confirmingBlock = false

    var body: some View {
        List {
            Section("物品说明") { Text(item.description); LabeledContent("状态", value: item.condition); LabeledContent("街区", value: item.approximateArea); LabeledContent("尺寸", value: item.dimensions ?? "未填写"); LabeledContent("搬运条件", value: item.floorElevator ?? "未填写"); LabeledContent("交接时间", value: item.availability) }
            Section {
                Button("申请领取") { showingClaim = true }.buttonStyle(.borderedProminent)
                Button("举报这个物品", role: .destructive) { showingReport = true }
                Button("在我的设备上隐藏") { store.hide(item) }
                Button("屏蔽此发布者", role: .destructive) { confirmingBlock = true }
            }
            Section("安全提醒") { Text("不要提前付款。建议白天在公共或有监控的地点交接，并在领取前自行检查物品。") }
        }
        .navigationTitle(item.title)
        .sheet(isPresented: $showingClaim) { ClaimView(item: item) }
        .sheet(isPresented: $showingReport) { ReportView(item: item) }
        .confirmationDialog("屏蔽此发布者？", isPresented: $confirmingBlock) {
            Button("屏蔽发布者", role: .destructive) { store.blockPublisher(of: item) }
        } message: {
            Text("此发布者当前及以后公开的物品都不会再显示在你的设备上。")
        }
    }
}
