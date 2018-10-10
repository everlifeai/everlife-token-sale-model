/*      outcome/
 * Since we handle HTTP requests it is useful to have our error types
 * contain the HTTP status. We also use the status to signal that this
 * error should be shown to the user (Errors that do not have status set
 * are only shown to the developer).
 */
module.exports.UserError = class extends Error {
    constructor(message, status, internalMessage){
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.status = status;
        this.internalMessage = internalMessage;
    }
};
