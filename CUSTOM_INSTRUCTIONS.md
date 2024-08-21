# Ballerine Web UI SDK - README

This README provides instructions on how to use the Ballerine Web UI SDK for document collection and customer onboarding.

## Setup

1. Run the `kyc-manual-review-example` to initialize the SDK with a token that represents a customer being onboarded.
   - By default, the example is initialized with a default token connected to a single case in the backoffice (dashboard).

2. Implement the Web UI SDK in your code, initializing it with the relevant token for each customer.
   - As this is an SDK, you can implement it in a way that best suits your needs.

## Creating New Cases

To create a new case when a new user uploads documents, follow these steps:

1. When a new user signs up on your app, create a new user on Ballerine by generating a new token.
   - Use the API endpoint `POST /api/v1/external/workflows/run` to create a new case in Ballerine.
   - Refer to the Ballerine documentation for more information on how to work with this endpoint.
   - From the response of this endpoint, you will receive the `workflowRuntimeId` and `entities.endUserId`.

2. Use the `workflowRuntimeId` and `entities.endUserId` from the previous step to generate a new token for the user.
   - Call the API endpoint `POST /api/v1/external/workflows/create-token` to create the token.
   - You will need to use the value of the `API_KEY` that is in the `workflows-service`'s `.env` file.

3. Provide the generated token to the user, allowing them to upload their document photos on Ballerine using the Web UI SDK.

## Important Notes

- When you refresh the document collection UI and upload new documents, it will override existing ones in the dashboard if the same token is used. It will not create a new case, as that is the responsibility of the backend (`workflows-service`).

- Make sure to generate a new token for each new user to create separate cases in the Ballerine database.

## Support

If you encounter any issues or have further questions, please refer to the Ballerine documentation or reach out to the Ballerine support team for assistance.