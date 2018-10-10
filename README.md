# token-sale-issuing-service
Service designed to look for credited payments, issue the payments, log potential errors and failed transactions
and change the status of the succeeded transactions to a separate archiver collection.

## Flow of the application
1. The program will check if there is another instance running on the database.
2. Verify if there are no unresolved failed transactions in the 'FailedPayment' collection.
3. Collect all 'PAYMENT_CREDITED' payments and create 'CreditPayment' objects and save them to this collection. Status is changed to 'ISSUING PENDING'.
4. Reformat all **CreditPayment** objects (to { recipient, amount }) so it works with the Stellar Batch Funder Tool.

5. The Batch funder creates a output.csv file for logging the status of each transaction and an allowtrust.csv file to see which accounts have been allowed trust from our issuance account.
6. The batch funder checks for account existence, trust lines, sends the allow trust operation to the investor and sends the funds if everything is fine.
7. Loop over the CSV entries in the output.csv file and log the succeeded / failed transactions. 
8. Update the status of the purchase objects accordingly: failed -> "PROBLEM_ISSUING" or success -> "ISSUED"
9. ISSUED payments are moved to the collection '**ArchivedPayment**' and the failed transactions are moved to '**FailedPayment**' collection.

10. Clean up: remove output.csv as we already looped the content of it - remove all objects in **CreditPayments** collection so it's ready for a new batch of payments.

## Mock users
It's possible to mock users with `node src/mocks/users.js`.
