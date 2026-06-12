import SwiftUI

struct ServiceView: View {
    @EnvironmentObject private var store: CommunityStore
    @State private var type = "家具搬运与本地配送"
    @State private var contact = ""
    @State private var details = ""
    @State private var result: String?
    @State private var accepted = false
    let types = ["家具搬运与本地配送", "搬家后清洁", "家具组装", "无人领取物品清走"]
    var body: some View {
        Form {
            Section { BrandHeader(title: "申请商家报价", subtitle: "平台补齐资料后，向经过核验的曼哈顿合作商家询价。提交不代表下单。") }
            Picker("需要什么服务？", selection: $type) { ForEach(types, id: \.self) { Text($0) } }
            TextField("平台联系你的微信、手机号或邮箱", text: $contact)
            TextField("请写街区、物品、尺寸、楼层、电梯、时间和预算", text: $details, axis: .vertical).lineLimit(6...12)
            Toggle("我同意服务条款与隐私政策", isOn: $accepted)
            Button("申请商家报价") { Task { await submit() } }.disabled(contact.isEmpty || details.isEmpty || !accepted)
            if let result { Text(result) }
        }.navigationTitle("服务报价")
    }
    private func submit() async {
        do { try await store.requestService(["service_type": type, "contact": contact, "details": details, "accepted_rules": true]); result = "需求已收到。平台会联系你确认详情。" } catch { result = error.localizedDescription }
    }
}

struct SafetyView: View {
    @EnvironmentObject private var store: CommunityStore
    @State private var clearedMessage: String?

    var body: some View {
        List {
            Section { BrandHeader(title: "安全与支持", subtitle: "免费互助不代表没有风险。请在领取前自行检查，并选择安全交接地点。") }
            Section("平台规则") {
                Label("禁止食品、药品、危险品和召回品", systemImage: "exclamationmark.triangle")
                Label("公开页面不显示联系方式或完整地址", systemImage: "eye.slash")
                Label("所有物品人工审核后才会公开", systemImage: "checkmark.shield")
                Label("不要提前付款或进入陌生人住宅", systemImage: "hand.raised")
            }
            Section("联系与文件") {
                Link("安全规则", destination: URL(string: "https://herbworld.app/safety")!)
                Link("取货码核销", destination: URL(string: "https://herbworld.app/handoff")!)
                Link("隐私政策", destination: URL(string: "https://herbworld.app/privacy")!)
                Link("服务条款", destination: URL(string: "https://herbworld.app/terms")!)
                Link("联系平台：微信 herbworldapp", destination: URL(string: "https://herbworld.app/safety")!)
            }
            Section("本机屏蔽管理") {
                Button("清除已屏蔽的发布者") {
                    store.clearBlockedPublishers()
                    clearedMessage = "已清除。返回附近物品并下拉刷新即可重新显示。"
                }
                if let clearedMessage { Text(clearedMessage).foregroundStyle(.secondary) }
            }
        }.navigationTitle("安全")
    }
}
