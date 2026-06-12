import SwiftUI

struct ClaimView: View {
    @EnvironmentObject private var store: CommunityStore
    @Environment(\.dismiss) private var dismiss
    let item: CommunityItem
    @State private var time = ""
    @State private var plan = ""
    @State private var contact = ""
    @State private var note = ""
    @State private var message: String?
    @State private var accepted = false
    var body: some View {
        NavigationStack {
            Form {
                Section("领取物品") { Text(item.title).font(.headline); Text(item.approximateArea) }
                TextField("什么时候可以领取？", text: $time)
                TextField("准备怎么搬？", text: $plan)
                TextField("微信、手机号或邮箱", text: $contact)
                TextField("补充说明（选填）", text: $note, axis: .vertical)
                Toggle("我同意交接安全规则", isOn: $accepted)
                Button("提交领取申请") { Task { await submit() } }.disabled(time.isEmpty || plan.isEmpty || contact.isEmpty || !accepted)
                if let message { Text(message) }
            }.navigationTitle("申请领取").toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } } }
        }
    }
    private func submit() async {
        do { try await store.claim(["item_id": item.id, "pickup_time": time, "transport_plan": plan, "contact": contact, "note": note, "accepted_rules": true]); message = "申请已收到，平台确认后会联系双方。" } catch { message = error.localizedDescription }
    }
}

struct ReportView: View {
    @EnvironmentObject private var store: CommunityStore
    @Environment(\.dismiss) private var dismiss
    let item: CommunityItem
    let reasons = ["疑似危险或召回产品", "虚假或误导信息", "骚扰或不当内容", "疑似收费或欺诈", "其他"]
    @State private var reason = "疑似危险或召回产品"
    @State private var details = ""
    @State private var contact = ""
    @State private var message: String?
    var body: some View {
        NavigationStack {
            Form {
                Section("举报物品") { Text(item.title) }
                Picker("举报原因", selection: $reason) { ForEach(reasons, id: \.self) { Text($0) } }
                TextField("请说明具体情况", text: $details, axis: .vertical).lineLimit(4...8)
                TextField("联系方式（选填）", text: $contact)
                Button("提交举报", role: .destructive) { Task { await submit() } }
                if let message { Text(message) }
            }.navigationTitle("举报").toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } } }
        }
    }
    private func submit() async {
        do { try await store.report(["item_id": item.id, "reason": reason, "details": details, "contact": contact]); store.hide(item); message = "举报已收到。平台会及时审核，该物品已在你的设备上隐藏。" } catch { message = error.localizedDescription }
    }
}
