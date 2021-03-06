const router = require('express').Router();
const { Business, Reviews, User } = require('../models');
const sequelize = require('sequelize')

const withAuth = require('../utils/auth');

router.get('/manageBusiness', withAuth, async (req, res) => {
    try {
        if (!req.session.loggedIn) {
            res.redirect('/login');
            return;
        }
        const dbProductData = await Business.findAll({
            where: {
                user_id: req.session.user_id
            }
        });

        let businesses = dbProductData.map((product) => product.get({ plain: true }));

        res.render('manageBusiness', {

            businesses,
            loggedIn: req.session.loggedIn,

        });
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});


router.get('/search/:term', withAuth, async (req, res) => {
    try {
        const dbBusinessData = await Business.findAll({
            offset: 0,
            limit: 10,
            where: {
                name: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), 'LIKE', '%' + req.params.term + '%')
            },
            include: [
                {
                    model: Reviews,
                    required: false,
                    attributes: ['rating'],
                },
            ],
        });
        let businesses = dbBusinessData.map((business) => business.get({ plain: true }));

        businesses.forEach((business) => {
            let total = 0;
            let reviews = business.reviews
            for (i = 0; i < reviews.length; i++) {
                total += reviews[i].rating
            }
            let totalRating = Math.round(total)
            business.totalRating = totalRating / reviews.length
        })
        req.session.user_id = 100
        res.render('searchResult', {
            businesses,
            loggedIn: req.session.loggedIn,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})

router.get('/:id', withAuth, async (req, res) => {
    try {
        let businessOwner = false;

        const dbBusinessData = await Business.findOne({
            where: {
                business_id: req.params.id
            },
            include: [
                {
                    model: Reviews,
                    attributes: ['review_id', 'review', 'user_id', 'rating', 'business_id', 'date_created'],
                    include: ['reviewer'],
                },
                'owner',
            ],
        });

        let business = dbBusinessData.get({ plain: true });

        for (i = 0;i < business.reviews.length; i++) {
            if (business.reviews[i].reviewer.user_id == req.session.user_id) {
                business.reviews[i].reviewOwner = true;
            }
        }

        if (req.session.user_id == business.user_id) {
            businessOwner = true;
        }

        res.render('viewBusiness', {
            businessOwner,
            business,
            loggedIn: req.session.loggedIn,
        });

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});


module.exports = router;