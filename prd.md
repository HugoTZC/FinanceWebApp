# **Project Requirements Document: Finapp**
**Website to manage finances**

In this project folder there are two more folders: 
- `frontend` - contains the frontend code of the website
- `backend` - contains the backend code of the website

so this PDR should work for both the frontend and the backend.
the `frontend` folder contains the `index.html` file which is the main file of the website. and the `backend` folder contains the `server.js` file which is the main file of the backend.

FRF requirements are for the `frontend` and FRB requirements are for the `backend`.

The following table outlines the detailed functional requirements of Finapp website.

| Requirement ID | Description | User Story | Expected Behavior/Outcome |
|-----------------|---------------------------|--------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| FRF001 | Login | As a user, I want to be able to login to my own account.              | The system should provide a login page for the user to authenticate, potentially presenting an option to create an account if needed. |
| FRF002 | Login 2 | As a user, I want to continue connected even if i close the page. | The system should create a token that expires in 3days, so the users can continue the session even if they close the page. |
| FRF003 | Log Off    | As a user, I want to be able to logoff at any time. | The system should display a button for loggin off. |
| FRF004 | Dashboard | As a user, I want to see all my cards, credits, savings, payments, transactions in one page or place. | The system should provide a dashboard page that displays all the user's cards, credits, savings, payments, and transactions in one place but on diferent tabs. |
| FRF005 | transactions | As a user, I want to be able to create transactions, whether is an income or an expense | The system should provide a mechanism for users to delete individual URLs from their list.                                                                        |
| FRF006 | Customizing the List URL  | As a user, I want to be able to choose a custom URL for my list so it's easy to remember and share. | The system should provide an input field where users can specify their desired custom URL. It should also handle cases where the chosen URL is already taken.     |
| FRF007 | Automatic URL Generation  | As a user, if I don't want to think of a custom URL, I want the system to automatically create one for my list so I can still share it. | The system should generate a unique and shareable URL for the list if the user doesn't provide one.                                                               |
| FRF08  | Publishing a List         | As a user, I want to be able to publish my list so that others can view the collection of URLs.  | Upon publishing, the list should be saved and made publicly accessible at the associated URL.                                                                     |
| FRF009 | Sharing a List            | As a user, I want to be able to easily share the link to my list with others through various channels. | The system should provide the user with the URL of their list, potentially with options for copying it.                                                           |
| FRF010 | Accessing a Shared List   | As a recipient, I want to be able to view the collection of URLs by clicking on or entering the shared link. | When a user visits a The Urlist link, they should be presented with the list of URLs.                                                                             |
| FRF011 | Viewing all lists         | As a user, I want to be able to see all the lists I have created so I can manage them easily.    | The system should provide a dashboard or overview page where users can see all their created lists.                                                               |
| FRF012 | Deleting a List           | As a user, I want to be able to delete an entire list if I no longer need it.                    | The system should provide a way for users to delete their entire list, including all associated URLs.                                                             |
