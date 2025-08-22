AcademiPlan: Your Personal Academic Dashboard 🚀

### Your personal academic dashboard that helps answer the age-old question: "Should I bunk?"\*

A full-stack, single-page web application designed as an all-in-one dashboard to help students manage their academic life, including per-subject attendance tracking, smart recommendations, and an interactive daily planner.

Key Features
Secure User Authentication: Full user registration and login system using JWT for stateless session management. Passwords are fully hashed on the back-end, and all data is segregated, ensuring a user can only access their own information.

Dynamic Subjects Dashboard: A responsive, card-based UI for tracking an unlimited number of subjects. Each card provides a real-time overview of attendance.

Smart Recommendation Engine: A rules-based algorithm in the back-end that calculates available bunks or, if attendance is low, the number of classes required to recover, providing contextual advice to the user.

Interactive Attendance Tracking: Users can update their attendance for any subject with a single click, which instantly updates the database and refreshes the UI.

Detailed History Log: A chronological log of all attendance updates ("Attended" or "Bunked"). Users can also "undo" an incorrect entry by deleting it, which correctly reverses the attendance calculation.

Interactive Planner: A full-featured calendar (powered by FullCalendar.js) where users can add, view, and delete timed events like tasks and exams.

### Technology Stack

| Category      | Technology                                                        |
| :------------ | :---------------------------------------------------------------- |
| **Front-End** | HTML5, CSS3, Vanilla JavaScript (ES6+), Pico.css, FullCalendar.js |
| **Back-End**  | Python, Flask                                                     |
| **Database**  | MongoDB (NoSQL) with PyMongo driver                               |
| **Security**  | Werkzeug (for password hashing), PyJWT (for JSON Web Tokens)      |
| **Tools**     | Git & GitHub, Visual Studio Code                                  |
