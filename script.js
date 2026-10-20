// API Gateway endpoint for the existing contact form backend.
const API_URL =
    "https://2582xx3bzl.execute-api.us-east-1.amazonaws.com/dev/contacts";

const form = document.getElementById("contactForm");
const submitBtn = document.getElementById("submitBtn");
const statusBox = document.getElementById("status");

/**
 * Display a status message accessibly.
 * The hidden property is removed so CSS can show the message.
 */
function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = type;
    statusBox.hidden = false;
}

/**
 * Parse a response body without assuming it is valid JSON.
 */
async function readResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch {
        return { message: responseText };
    }
}

/**
 * Unwrap a Lambda proxy response when API Gateway returns it as JSON.
 */
function unwrapLambdaResponse(payload) {
    if (
        payload &&
        typeof payload.body === "string"
    ) {
        try {
            return {
                ...JSON.parse(payload.body),
                statusCode: payload.statusCode
            };
        } catch {
            // Keep the original payload if the body is not JSON.
        }
    }

    if (
        payload &&
        payload.body &&
        typeof payload.body === "object"
    ) {
        return {
            ...payload.body,
            statusCode: payload.statusCode
        };
    }

    return payload || {};
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Browser validation handles required fields, email format and length.
    if (!form.reportValidity()) {
        return;
    }

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        message: document.getElementById("message").value.trim()
    };

    // Extra client-side checks; Lambda must validate again on the server.
    if (
        !formData.name ||
        !formData.email ||
        formData.message.length < 5
    ) {
        showStatus(
            "Please enter your name, a valid email, and a message of at least 5 characters.",
            "error"
        );
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    statusBox.hidden = true;
    statusBox.textContent = "";
    statusBox.className = "";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const rawResult = await readResponse(response);
        const result = unwrapLambdaResponse(rawResult);

        const embeddedStatus = Number(result.statusCode);
        const hasEmbeddedStatus =
            Number.isFinite(embeddedStatus) &&
            embeddedStatus >= 100 &&
            embeddedStatus <= 599;

        const isHttpSuccess =
            response.ok &&
            (!hasEmbeddedStatus || embeddedStatus < 400);

        const indicatesFailure =
            result.error ||
            result.success === false ||
            result.status === "error";

        if (isHttpSuccess && !indicatesFailure) {
            showStatus(
                result.message || "Your message was submitted successfully!",
                "success"
            );
            form.reset();
        } else {
            showStatus(
                result.error ||
                result.message ||
                "Unable to send your message. Please try again.",
                "error"
            );
        }
    } catch (error) {
        console.error("Contact form request failed:", error);

        showStatus(
            "Could not complete the request. Check your internet connection, API endpoint, and API CORS settings, then try again.",
            "error"
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
    }
});
