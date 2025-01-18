# Ping-Pong Tracker 🏓📊

![Ping-Pong Tracker Logo](public/img/ping-pong-paladin.png)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [ELO Rating System](#elo-rating-system)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

**Ping-Pong Tracker** is a dynamic web application designed to help ping-pong enthusiasts track and analyze their game statistics. Whether you're a casual player or a competitive athlete, this platform allows you to create and manage rooms, record match results, and monitor your global ELO-based ratings. Engage with friends, challenge yourself, and elevate your game with comprehensive statistical insights.

## Features

- **User Authentication:** Secure registration and login using Firebase Authentication.
- **Room Management:** Create and join rooms to organize matches with friends.
- **Player Profiles:** Maintain individual player profiles with global ELO ratings.
- **Match Recording:** Log match results and automatically update ELO ratings.
- **Statistics Dashboard:** Visualize performance metrics and track progress over time.
- **Responsive Design:** Optimized for both desktop and mobile devices using Tailwind CSS.
- **Real-time Updates:** Instantaneous reflection of changes across the platform with Firebase Firestore.

## Technologies Used

- **Frontend:**
  - [React](https://reactjs.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [React Router DOM](https://reactrouter.com/)
  - [React Icons](https://react-icons.github.io/react-icons/)
  - [React Notifications Component](https://github.com/teodosii/react-notifications-component)

- **Backend:**
  - [Firebase](https://firebase.google.com/)
    - Authentication
    - Firestore

- **Other Libraries:**
  - [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://github.com/reactchartjs/react-chartjs-2)
  - [Animate.css](https://animate.style/)
  - [Font Awesome](https://fontawesome.com/)

## Installation

### Prerequisites

- **Node.js** (version 14 or above)
- **npm** (version 6 or above) or **Yarn**

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/arttusulkonen/ping-pong-tracker.git
   cd ping-pong-tracker
    ```
2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Firebase Project**

   - Create a new project on [Firebase Console](https://console.firebase.google.com/).
   - Enable **Email/Password** authentication in the **Authentication** section.
   - Create a new **Firestore** database in the **Database** section.

4. **Configure Firebase**

   - Copy the Firebase configuration object from the Firebase Console.
   - Create a new file named `.env.local` in the root directory.
   - Add the following environment variables to the file:

     ```env
     REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
     REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
     REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
     REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
     REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID
     ```
5. **Run the Application**

   ```bash
   npm run start
   ```
6. **Access the Application**

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Register an Account**

  - Navigate to the Register page.
	- Provide a unique nickname, a valid email, and a secure password.
	- Submit the form to create your account.

2. **Login**

  - Navigate to the Login page.
  - Enter your email and password.
  - Click the Login button to access the platform.

3.	**Create and Manage Rooms**

  - From the dashboard, create a new room to organize matches.
  - Invite friends to join your room and compete.

4. **Record Match Results**

  - Within a room, select two players and input their scores.
  - Submit the match to automatically update ELO ratings.

5. **View Statistics**

  - Access detailed statistics and performance charts.
  - Monitor your progress and rankings over time.

## ELO Rating System

**Ping-Pong Tracker** utilizes the ELO rating system to calculate and update player statistics based on match outcomes. Unlike per-room individual ratings, the ELO scores are based on the player’s global rating, ensuring a consistent and fair evaluation across all games and rooms.

### How It Works

1. **Initial Ratings**
   
   - Every player starts with an initial rating of **1000 points**.

2. **Expected Scores**
   
   - The expected score of a player is calculated using the following formula:
     
     ![Expected Score Formula](https://latex.codecogs.com/png.latex?E(A)%20=%20\frac{1}{1%20+%2010^{\frac{R(B)%20-%20R(A)}{400}}})

   - **E(A):** Expected score of Player A.
   - **R(A):** Current rating of Player A.
   - **R(B):** Current rating of Player B.
   - **K-Factor (K):** Determines the sensitivity of the rating changes (fixed at 32).

3. **Actual Scores**
   
   - The actual score of a player is determined by the match outcome:
     
     - If Player A wins, **S(A) = 1** and **S(B) = 0**.
     - If Player B wins, **S(A) = 0** и **S(B) = 1**.

4. **Rating Updates**
   
   - The new ratings of players A and B are calculated using the following formulas:
     
     ![Rating Update Formula A](https://latex.codecogs.com/png.latex?R'(A)%20=%20R(A)%20+%20K%20\times%20(S(A)%20-%20E(A)))
     
     ![Rating Update Formula B](https://latex.codecogs.com/png.latex?R'(B)%20=%20R(B)%20+%20K%20\times%20(S(B)%20-%20E(B)))

   - **R'(A):** Updated rating of Player A.
   - **R'(B):** Updated rating of Player B.
   - **S(A):** Actual score of Player A.
   - **S(B):** Actual score of Player B.
   - **E(A):** Expected score of Player A.
   - **E(B):** Expected score of Player B.

5. **Rating Changes**
   
   - The rating changes are determined by the difference between the actual and expected scores:
     
     - If the actual score is higher than the expected score, the rating increases.
     - If the actual score is lower than the expected score, the rating decreases.

6. **K-Factor**
   
   - In the current implementation, the **K-factor is fixed at 32** for all players, providing consistent sensitivity for rating changes.

### Example Calculation

Assuming Player A has a rating of 1400 and Player B has a rating of 1600.

1. **Calculate Expected Scores:**
   
   ![Expected Score A](https://latex.codecogs.com/png.latex?E(A)%20=%20\frac{1}{1%20+%2010^{\frac{1600%20-%201400}{400}}}%20=%20\frac{1}{1%20+%2010^{0.5}}%20\approx%200.240)
   
   ![Expected Score B](https://latex.codecogs.com/png.latex?E(B)%20=%20\frac{1}{1%20+%2010^{\frac{1400%20-%201600}{400}}}%20=%20\frac{1}{1%20+%2010^{-0.5}}%20\approx%200.760)

2. **Match Outcome:**
   
   - If Player A wins: **S(A) = 1**, **S(B) = 0**.

3. **Update Ratings:**
   
   ![Rating Update A](https://latex.codecogs.com/png.latex?R'(A)%20=%201400%20+%2032%20\times%20(1%20-%200.240)%20\approx%201424)
   
   ![Rating Update B](https://latex.codecogs.com/png.latex?R'(B)%20=%201600%20+%2032%20\times%20(0%20-%200.760)%20\approx%201576)


## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue if you encounter any problems.

1. **Fork** the repository
  - Click the “Fork” button at the top right of this page to create a copy of the repository in your GitHub account.

2. **Clone** the repository
  - git clone https://github.com/YOUR_USERNAME/ping-pong-tracker.git
  - cd ping-pong-tracker

3. **Install Dependencies**
  - npm install

4. **Create a New Branch**
  - git checkout -b feature/your-feature-name

5. **Make Changes**
  - Add your changes to the project.
  
6. **Commit Changes**
  - git commit -m "Your commit message"

7. **Push Changes**
  - git push origin feature/your-feature-name

8. **Open a Pull Request**
  - Go to the original repository and click the “New pull request” button.
  - Select your branch and create the pull request.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software in accordance with the terms of the license.

## Contact
- Email: [arttu.sulkonen@icloud.com](mailto:arttu.sulkonen@icloud.com)
- GitHub: [arttusulkonen](https://github.com/arttusulkonen)
- LinkedIn: [Arttu Sulkonen](https://www.linkedin.com/in/arttu-sulkonen/)



