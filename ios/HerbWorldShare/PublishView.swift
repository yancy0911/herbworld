import SwiftUI

struct PublishView: View {
    @EnvironmentObject private var store: CommunityStore
    @State private var title = ""
    @State private var category = "家具"
    @State private var condition = ""
    @State private var area = ""
    @State private var dimensions = ""
    @State private var access = ""
    @State private var availability = ""
    @State private var contact = ""
    @State private var details = ""
    @State private var accepted = false
    @State private var submitting = false
    @State private var result: String?
    let categories = ["家具", "家居用品", "小型电器", "书籍", "搬家用品", "其他"]

    var body: some View {
        Form {
            Section { BrandHeader(title: "免费发布物品", subtitle: "提交后平台会联系你收取照片，人工审核后才会公开。") }
            FormSection(title: "这是什么物品？", help: "例如：五层书架、落地灯、搬家纸箱") { TextField("物品名称", text: $title) }
            FormSection(title: "选择类别", help: "选择最接近的一项") { Picker("类别", selection: $category) { ForEach(categories, id: \.self) { Text($0) } } }
            FormSection(title: "物品状态", help: "请说明划痕、缺件或损坏") { TextField("例如：稳固，有轻微划痕", text: $condition) }
            FormSection(title: "曼哈顿哪个街区？", help: "不要填写门牌号") { TextField("例如：Upper East Side 近 86 St", text: $area) }
            FormSection(title: "大概尺寸", help: "宽 × 深 × 高；不知道可写大概大小") { TextField("例如：24 × 10 × 71 英寸", text: $dimensions) }
            FormSection(title: "怎样搬出来？", help: "楼层、有无电梯、需要几个人") { TextField("例如：三楼无电梯，需要两个人", text: $access) }
            FormSection(title: "方便交接的时间", help: "写几个通常方便的时间段") { TextField("例如：周六上午", text: $availability) }
            FormSection(title: "平台怎样联系你？", help: "不会公开展示") { TextField("微信、手机号或邮箱", text: $contact).textContentType(.emailAddress) }
            FormSection(title: "需要提前说明什么？", help: "明显缺陷、缺失配件、重量或限制") { TextField("物品说明", text: $details, axis: .vertical).lineLimit(4...8) }
            Toggle("我确认这是我的物品、完全免费，并同意试点规则", isOn: $accepted)
            Button(submitting ? "正在提交" : "提交人工审核") { Task { await submit() } }.disabled(!valid || submitting)
            if let result { Text(result).foregroundStyle(.secondary) }
        }.navigationTitle("免费发布")
    }

    private var valid: Bool { !title.isEmpty && !condition.isEmpty && !area.isEmpty && !availability.isEmpty && !contact.isEmpty && !details.isEmpty && accepted }
    private func submit() async {
        submitting = true; defer { submitting = false }
        do {
            try await store.publish(["title": title, "category": category, "condition": condition, "approximate_area": area, "dimensions": dimensions, "floor_elevator": access, "availability": availability, "contact": contact, "description": details, "needs_service": "不需要", "owns_item": true, "accepted_rules": true])
            result = "提交成功。平台会联系你收取照片并完成审核。"
            title = ""; condition = ""; area = ""; dimensions = ""; access = ""; availability = ""; details = ""; accepted = false
        } catch { result = error.localizedDescription }
    }
}
