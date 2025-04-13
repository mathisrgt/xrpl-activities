# Collab multisig activity generation:

Generate and fund each student wallet
Generate and fund the multisig wallet
// opt: Send a tx with a memo containing signers
Create and send the signers list by the multisig
=> watcher detect the signers list creation => turn status to inProgress

One of the student generate request the tx
Each student give their approval

The tx is sent to the solution account
=> watcher detect the tx on the solution account
