const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

const db = require("./config/db.config")
dotenv.config();

const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidates.routes');
const scoreRoutes = require('./routes/scores.routes');
const offerRoutes = require('./routes/offers.routes');
const rulesdocument = require("./routes/documentRules.routes")
const AllowedOrigin = [process.env.FRONTEND_URL,process.env.DEV_URL,"*"]


const app = express();
app.use(cors({
    origin : AllowedOrigin,
    methods : ["POST","GET","PATCH","PUT","DELETE"]
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// mongoose.connect(process.env.MONGO_URL, { })
//   .then(() => console.log('Mongo connected'))
//   .catch(err => { console.error(err); process.exit(1); });

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/docs', rulesdocument );

// serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_, res) => res.json({ message: 'HirePortal backend running' }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
