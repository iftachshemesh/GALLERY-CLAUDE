README.md
Project Overview
This project is a dynamic digital art gallery designed to showcase a collection of original artworks. The application provides an immersive, clean, and responsive user interface for viewing high-resolution images, managing artistic metadata, and exploring various stylistic themes.
________________
Features
* Dynamic Image Rendering: Seamlessly displays a diverse collection of artwork with high-fidelity visuals.
* Responsive Design: Optimized for a smooth viewing experience across desktops, tablets, and mobile devices.
* Categorization & Metadata: Detailed descriptions for each piece, including titles, styles, and creation details.
* Robust Backend: Powered by a modern tech stack to ensure fast load times and efficient data management.
________________
Tech Stack
* Frontend: HTML5, CSS3, JavaScript (EJS for templating)
* Backend: Node.js, Express.js
* Database: SQLite for lightweight and efficient data storage
* Deployment: Configured for hosting on platforms like Railway
________________
Installation & Setup
1. Clone the Repository:
Bash
git clone https://github.com/your-username/gallery-project.git
cd gallery-project

2. Install Dependencies:
Bash
npm install

3. Database Configuration:
Ensure the SQLite database file is initialized in the root directory. Run any provided migration scripts if necessary.
4. Run the Application:
Bash
npm start

The server will typically start on http://localhost:10000
________________
Project Structure
   * /public: Static assets including CSS, client-side JS, and image files.
   * /views: EJS templates for rendering the gallery pages.
   * /routes: Logic for handling navigation and data requests.
   * server.js: The main entry point for the Express application.
   * gallery.db: The SQLite database containing artwork information.
________________
License
This project is private and all rights to the artwork and code are reserved by the author.