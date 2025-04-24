# Crypto activity generation:

- A student account, solution account, multiple fake accounts, a sender account are generated
- A message is generated for each account with a random value "Send {random amount} XRP to {account}"
- All messages are signed by each account
- The sender send all message and their signatures to the student under one transaction

# Student flow

- The student verify the messages until he find the signed message signed by the right account
- The student send the amount to the right account

# Crypto activity watcher

- The watcher check if the transaction have been sent to the right account
- The student send the amount to the right account