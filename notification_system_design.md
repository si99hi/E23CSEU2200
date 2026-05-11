# Notification System Design

Stage 1: REST API Design

A notification platform requires several core operations - fetching notifications, marking them as read, and receiving real time updates.

Proposed endpoints:

GET /api/notifications - Retrieves all notifications for the authenticated user. Accepts page and limit query parameters for pagination.

GET /api/notifications/unread/count - Returns the count of unread notifications.

PUT /api/notifications/{id}/read - Marks a specific notification as read.

PUT /api/notifications/read-all - Marks all notifications as read for the user.

DELETE /api/notifications/{id} - Deletes a notification.

GET /api/notifications/stream - Establishes an SSE connection for real time notifications.

For real time updates, Server Sent Events are suitable because the communication is one way from server to client. SSE handles reconnection automatically and works over standard HTTP. WebSockets would add unnecessary complexity for this use case.

Example response from GET /api/notifications:

{
  "data": [
    {
      "id": "notif_001",
      "type": "Placement",
      "message": "Amazon hiring for SDE roles",
      "isRead": false,
      "createdAt": "2026-05-11T10:30:00Z"
    }
  ],
  "total": 50,
  "unreadCount": 15
}







Stage 2: Database Selection

PostgreSQL is the preferred choice for this system. It provides ACID compliance which ensures notification data remains consistent. It also supports JSONB columns for metadata and has robust indexing capabilities.

Database schema:

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

As data volume increases, two issues emerge. Query performance degrades when scanning millions of rows. Storage consumption grows continuously.

For performance, composite indexes on columns used in WHERE clauses such as (user_id, is_read, created_at) will convert full table scans to index seeks.

For storage, notifications older than 6 months can be archived to a separate table or moved to cold storage.







Stage 3: Fixing a Slow Query

The problematic query:

SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;

This query performs poorly because no composite index exists covering all three conditions - studentID, isRead, and createdAt. The database resorts to a full table scan or uses a suboptimal index.

The fix:

CREATE INDEX idx_student_unread ON notifications(studentID, isRead, createdAt DESC);

With this index, the database can locate the relevant rows directly without scanning unnecessary data.

Regarding the suggestion to index every column, this approach is ineffective. Each additional index slows down INSERT, UPDATE, and DELETE operations. Indexes also consume disk space and may confuse the query planner. Only columns used in filtering or sorting should be indexed.

Query to find students who received placement notifications in the last 7 days:

SELECT DISTINCT u.id, u.email, u.roll_number
FROM users u
JOIN notifications n ON u.id = n.user_id
WHERE n.type = 'Placement'
  AND n.created_at >= CURRENT_DATE - INTERVAL '7 days';





Stage 4: Making Things Faster

Loading notifications on every page request creates excessive database load.

Several strategies can address this:

Redis caching - Store frequent query results in memory with a 5 minute time to live. This reduces database hits significantly but introduces potential for stale data.

Pagination - Load 20 notifications per request instead of fetching everything at once. Additional items load as the user scrolls.

Read replicas - Route read queries to replica databases while writes go to the primary instance. This adds infrastructure cost but scales well.

The recommended approach is to implement pagination first since it requires minimal changes. Redis caching can be added for the first page of results as most users rarely navigate beyond it. Read replicas become relevant only at higher traffic volumes.





Stage 5: Notifying All 50,000 Students

The current pseudocode processes each student sequentially and sends emails one by one. This approach has two major flaws. First, execution time is prohibitively long for 50,000 students. Second, if the email API fails midway, some students receive notifications while others do not.

Database save and email sending should not happen together. They must be separated.

Revised pseudocode:

function notify_all(student_ids, message):
    batch_size = 1000
    
    for batch in chunks(student_ids, batch_size):
        insert_into_notifications_table(batch, message)
    
    for batch in chunks(student_ids, batch_size):
        push_to_message_queue({
            type: "email_notification",
            recipients: batch,
            message: message
        })
    
    return { queued: student_ids.length, status: "processing" }

Worker processes then handle the queue independently:

function email_worker():
    while true:
        job = pop_from_queue()
        for student in job.recipients:
            attempt = 0
            while attempt < 3:
                try:
                    send_email(student, job.message)
                    break
                catch error:
                    attempt++
                    wait(attempt * 1000)
            if attempt == 3:
                log_failure(student, error)
                move_to_dead_letter_queue(job)

This approach ensures notifications are never lost, failed emails are retried automatically, and the system can scale by adding more workers.






Stage 6: Priority Inbox

The requirement is to display the top N unread notifications where priority depends on type (Placement highest, then Result, then Event) and recency.

Priority calculation uses weights assigned to each type - Placement gets 3, Result gets 2, Event gets 1. The score formula is:

score = (weight * 10^13) + timestamp_in_milliseconds

The large weight multiplier ensures all Placement notifications appear before any Result notifications regardless of their timestamp. Within the same type, newer timestamps yield higher scores.

For the initial load of notifications, sorting all items by score and taking the first N works adequately. This has time complexity of O(n log n).

To maintain the top N efficiently as new notifications arrive, a min heap of size N is appropriate. For each new notification, its score is calculated. If the heap contains fewer than N items, the notification is inserted. If the heap is full and the new score exceeds the smallest score in the heap, the smallest is removed and the new one is inserted. Otherwise the notification is discarded.

This approach requires O(log N) time per new notification and uses O(N) memory instead of storing all notifications.