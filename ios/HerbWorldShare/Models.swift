import Foundation

struct CommunityItem: Codable, Identifiable, Hashable {
    let id: Int
    let publisherKey: String
    let title: String
    let description: String
    let category: String
    let condition: String
    let approximateArea: String
    let dimensions: String?
    let floorElevator: String?
    let availability: String

    enum CodingKeys: String, CodingKey {
        case id, title, description, category, condition, dimensions, availability
        case publisherKey = "publisher_key"
        case approximateArea = "approximate_area"
        case floorElevator = "floor_elevator"
    }
}

struct ItemsResponse: Codable { let items: [CommunityItem] }

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

struct ErrorResponse: Codable { let error: String }
