#Setup

## 📋 Prerequisites

* [Node.js & npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) (npm **v10.9.2** or higher)
* A modern web browser (Chrome, Firefox, Edge, etc.)
* [Git](https://git-scm.com/downloads) (if cloning the repository)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

You can either **clone** using Git:

```bash
cd <directory-of-your-choice>
git clone https://github.com/OpenFrontIO/OpenFrontIO.git
cd OpenFrontIO
```

Or download the `.zip` from GitHub and extract it, then navigate into the extracted folder.

### 2. Install Dependencies

```bash
npm install
```

---

## 🎮 Running the Game

### Development Mode

To run both the **client** and **server** in development mode (with live reloading):

```bash
npm run dev
```

This will:

* Start the Webpack dev server for the client
* Launch the game server with development settings
* Open the game in your default browser

### Client Only

If you want to


Here's the complete `.md` file content combining both setup guides into a single, polished `README.md`:

````markdown
# OpenFrontIO

OpenFrontIO is a real-time multiplayer strategy game focused on territorial control and alliance-building.

---

## 📋 Prerequisites

- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) (npm **v10.9.2** or higher)
- A modern web browser (Chrome, Firefox, Edge, etc.)
- [Git](https://git-scm.com/downloads) (for cloning the repository)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

Using Git:

```bash
cd <directory-of-your-choice>
git clone https://github.com/OpenFrontIO/OpenFrontIO.git
cd OpenFrontIO
````

Alternatively, download the `.zip` from the GitHub repo and extract it, then `cd` into the extracted folder.

### 2. Install Dependencies

```bash
npm install
```

---

## 🎮 Running the Game

### Development Mode (Client + Server)

Run both the client and server with live reloading:

```bash
npm run dev
```

This will:

* Start the Webpack dev server for the client
* Launch the game server in development mode
* Open the game in your default browser

### Client Only (Frontend)

Run only the client:

```bash
npm run start:client
```

### Server Only (Backend)

Run only the server in development mode:

```bash
npm run start:server-dev
```

---

## 🛠️ Development Tools

### Format Code

```bash
npm run format
```

### Lint Code

```bash
npm run lint
```

### Lint and Auto-Fix

```bash
npm run lint:fix
```

### Run Tests

```bash
npm test
```

---

## 📎 Notes

* Starting the dev server may take a little time, especially on first run.
* Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 📜 License

[MIT](LICENSE)

```

Let me know if you want to add project screenshots, contributor guidelines, environment variables setup, or Docker support!
```


Here is the combined `.md` file content for your **OpenFrontIO** project documentation, merging both setup and development instructions in a clean, structured format:

---

````markdown
# OpenFrontIO

An online real-time strategy game focused on territorial control and alliance building.

---

## 📋 Prerequisites

- [Node.js & npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) (npm **v10.9.2** or higher)
- A modern web browser (Chrome, Firefox, Edge, etc.)
- [Git](https://git-scm.com/downloads) (if cloning the repository)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

Using Git:

```bash
cd <directory-of-your-choice>
git clone https://github.com/OpenFrontIO/OpenFrontIO.git
cd OpenFrontIO
````

Or download the `.zip` from GitHub and extract it manually.

### 2. Install Dependencies

```bash
npm install
```

---

## 🎮 Running the Game

### Development Mode

Run both the client and server with hot reloading:

```bash
npm run dev
```

This will:

* Start the Webpack dev server for the client
* Launch the game server with development settings
* Automatically open the game in your default browser

### Client Only

To run only the client with hot reloading:

```bash
npm run start:client
```

### Server Only

To run only the game server in development mode:

```bash
npm run start:server-dev
```

---

## 🛠️ Development Tools

### Format Code

```bash
npm run format
```

### Lint Code

```bash
npm run lint
```

### Lint and Auto-fix Code

```bash
npm run lint:fix
```

### Run Tests

```bash
npm test
```

---

## 💡 Notes

* First startup may take some time due to module bundling and dependency initialization.
* For deployment or production setup, refer to the project's production build instructions (if available).

---
