# Domain model

Source: [`prisma/schema.prisma`](../../prisma/schema.prisma). Attributes list stored Prisma fields; relation fields appear as edges. `?` in the schema denotes an optional field. `String[]` and `Json[]` are Prisma list types.

Only declared Prisma `@relation` references are drawn. Other ID fields and partition keys are stored values, not Prisma relations.

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email UK
        String password
        String? phone
        Boolean emailVerified
        String? verificationToken
        DateTime? verificationTokenExpiry
        Boolean emailNotifications
        Boolean sharePhoneOnMatch
        DateTime createdAt
        DateTime? onboardingCompletedAt
        Role role
    }

    UserIdentity {
        String id PK
        String provider
        String providerSubject
        String userId FK,UK
        DateTime createdAt
        DateTime updatedAt
    }

    Subject {
        String id PK
        String code UK
        String name
        Int year
        Int semester
    }

    Class {
        String id PK
        String name UK
        Int year
    }

    SingleSwapRequest {
        String id PK
        String userId FK
        String subjectId FK
        String currentClassId FK
        String[] preferredClassIds
        Boolean preferenceOrderMatters
        TicketType ticketType
        RequestStatus status
        Int priority
        Float? satisfactionScore
        String? provisionalMatchId
        DateTime? provisionalUntil
        String graphPartition
        DateTime createdAt
        DateTime updatedAt
        DateTime? lastProcessed
    }

    BundleSwapRequest {
        String id PK
        String userId FK
        String currentClassId FK
        String[] preferredClassIds
        Boolean preferenceOrderMatters
        TicketType ticketType
        RequestStatus status
        Int priority
        Float? satisfactionScore
        String? provisionalMatchId
        DateTime? provisionalUntil
        String graphPartition
        DateTime createdAt
        DateTime updatedAt
        DateTime? lastProcessed
    }

    Match {
        String id PK
        MatchType matchType
        SwapPattern swapPattern
        MatchStatus status
        Boolean isProvisional
        DateTime? provisionalUntil
        Float? satisfactionScore
        Int? processingTime
        String graphPartition
        Json[] participants
        String[] singleSwapRequestIds
        String[] bundleSwapRequestIds
        DateTime createdAt
        DateTime updatedAt
    }

    MatchNotificationDelivery {
        String id PK
        String matchId
        String userId
        String notificationType
        String email
        NotificationDeliveryStatus status
        DateTime reservedAt
        DateTime? sentAt
        String? lastError
        DateTime updatedAt
    }

    GraphPartition {
        String id PK
        String partitionKey UK
        TicketType ticketType
        String? subjectId
        Int? year
        Int activeRequests
        DateTime? lastProcessed
        Int? avgProcessingTime
        Float? successRate
        Int priority
        Boolean isLocked
        DateTime? lockedAt
        String? lockedBy
        DateTime createdAt
        DateTime updatedAt
    }

    CronExecution {
        String id PK
        String jobId
        String jobName
        DateTime startedAt
        DateTime? completedAt
        Int? duration
        CronStatus status
        Int processedPartitions
        Int matchesFound
        Int expiredMatches
        Int totalActiveRequests
        String[] errors
        Json? metadata
    }

    CronLock {
        String id PK
        String jobId UK
        DateTime expiresAt
        DateTime createdAt
    }

    RateLimitBucket {
        String id PK
        String key UK
        Int count
        DateTime expiresAt
        DateTime createdAt
    }

    User ||--o| UserIdentity : "userId -> id"
    User ||--o{ SingleSwapRequest : "userId -> id"
    User ||--o{ BundleSwapRequest : "userId -> id"
    Subject ||--o{ SingleSwapRequest : "subjectId -> id"
    Class ||--o{ SingleSwapRequest : "currentClassId -> id"
    Class ||--o{ BundleSwapRequest : "currentClassId -> id"
```
