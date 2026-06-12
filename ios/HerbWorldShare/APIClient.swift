import Foundation

@MainActor
final class CommunityStore: ObservableObject {
    @Published var items: [CommunityItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let baseURL = URL(string: "https://herbworld.app")!

    func loadItems() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: ItemsResponse = try await request(path: "/api/community/items")
            let hidden = Set(UserDefaults.standard.array(forKey: "hiddenItemIDs") as? [Int] ?? [])
            let blocked = Set(UserDefaults.standard.stringArray(forKey: "blockedPublisherKeys") ?? [])
            items = response.items.filter { !hidden.contains($0.id) && !blocked.contains($0.publisherKey) }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func hide(_ item: CommunityItem) {
        var hidden = Set(UserDefaults.standard.array(forKey: "hiddenItemIDs") as? [Int] ?? [])
        hidden.insert(item.id)
        UserDefaults.standard.set(Array(hidden), forKey: "hiddenItemIDs")
        items.removeAll { $0.id == item.id }
    }

    func blockPublisher(of item: CommunityItem) {
        var blocked = Set(UserDefaults.standard.stringArray(forKey: "blockedPublisherKeys") ?? [])
        blocked.insert(item.publisherKey)
        UserDefaults.standard.set(Array(blocked), forKey: "blockedPublisherKeys")
        items.removeAll { $0.publisherKey == item.publisherKey }
    }

    func clearBlockedPublishers() {
        UserDefaults.standard.removeObject(forKey: "blockedPublisherKeys")
    }

    func publish(_ body: [String: Any]) async throws {
        let _: StatusResponse = try await request(path: "/api/community/items", method: "POST", body: body)
    }

    func claim(_ body: [String: Any]) async throws {
        let _: StatusResponse = try await request(path: "/api/community/claims", method: "POST", body: body)
    }

    func requestService(_ body: [String: Any]) async throws {
        let _: StatusResponse = try await request(path: "/api/community/services", method: "POST", body: body)
    }

    func report(_ body: [String: Any]) async throws {
        let _: StatusResponse = try await request(path: "/api/community/reports", method: "POST", body: body)
    }

    private func request<T: Decodable>(path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError(message: "无法连接服务器") }
        guard 200..<300 ~= http.statusCode else {
            let message = (try? JSONDecoder().decode(ErrorResponse.self, from: data).error) ?? "提交失败，请稍后再试"
            throw APIError(message: message)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

struct StatusResponse: Codable {
    let item: StatusRecord?
    let claim: StatusRecord?
    let request: StatusRecord?
    let report: StatusRecord?
}

struct StatusRecord: Codable {
    let id: Int
    let status: String
}
