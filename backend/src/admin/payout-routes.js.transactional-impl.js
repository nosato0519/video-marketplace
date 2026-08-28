// Transactional implementation reference: the canonical Admin payout route
// should perform SELECT ... FOR UPDATE, transition validation, UPDATE and
// audit insertion on one transaction before COMMIT.