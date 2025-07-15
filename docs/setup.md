# Setup

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

Or download the `.zip` from the GitHub repo and extract it, then `cd` into the extracted folder.

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
* You can play the game without logging in, but logging in with Discord enables additional features.
* Contributions are welcome! Feel free to open issues or submit pull requests.


