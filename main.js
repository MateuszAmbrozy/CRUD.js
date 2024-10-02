require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000; // Port ustawiony na 5000 w pliku .env
const URI = process.env.DB_URI; // URI bazy danych

// Połączenie z bazą danych
//mongoose.connect(URI);
const uri = "mongodb+srv://root1:root1@nodeapp.syelu.mongodb.net/?retryWrites=true&w=majority&appName=NodeApp";
const uri2 = "mongodb://localhost:27017/node_crud";
async function connect()
{
    try{
        await mongoose.connect(uri);
        console.log("Conntected to db");
    }
    catch(error)
    {
        console.error(error);
    }
}

connect();

// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
    secret: 'my secret key',
    saveUninitialized: true,
    resave: false
}));

app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

// Ustawienie silnika szablonów
app.set("view engine", "ejs");

app.use("", require("./routes/routes"));

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});
