var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');
const { response, render } = require('../app');

const verifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

/* GET home page. */
router.get('/api/products', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  console.log('session', req.session.user);
  if (user) {
    console.log('in user');

    // Fetch cart count and wishlist 
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    let wishlist = await userHelpers.getWishlist(req.session.user._id);

    // Fetch products
    let products = await productHelpers.getAllProducts();

    // Mark products that are in the wishlist
    products.forEach(product => {
      product.isInWishlist = wishlist.products.some(item => item.item.toString() === product._id.toString());
    });

    // Render the page with products, user, cartCount, and wishlist status

    res.json({ products, user, cartCount })
  } else {
    console.log('no user');

    // If no user is logged in, fetch products and render the page without wishlist
    productHelpers.getAllProducts().then((products) => {
      res.json({ products })
    });
  }
});

router.get('/api/login', (req, res) => {
  console.log('Session User:', req.session.user); // Log session user data for debugging
  if (req.session.user && req.session.user.loggedIn) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false, message: req.session.info });
    req.session.info = false;
  }
});

router.post('/api/login', (req, res) => {
  console.log('from react', req.body);

  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = { loggedIn: true, ...response.user };
      console.log('session', req.session.user);
      res.json({ loggedIn: true, user: req.session.user })
      console.log('session1', req.session.user);

    } else {
      req.session.loginErr = "Invalid username or password";
      res.json({ loggedIn: false, message: req.session.loginErr })
    }
  });
});

router.get('/api/signup', (req, res) => {

  res.json({ "info": req.session.signupErr })
  req.session.info = false
})
router.post('/api/signup', (req, res) => {
  console.log('api call signup');

  userHelpers.doSignup(req.body).then((response1) => {
    console.log('resoponse1', response1)
    if (response1.status) {
      req.session.user = { loggedIn: true, ...response1.user };
      res.json({ status: true, user: req.session.user });
    } else {
      req.session.signupErr = 'This number is already taken';
      res.json({ status: false });
    }
  });
});



router.get('/api/logout', (req, res) => {
  console.log('api call');

  req.session.user = null
  res.json({ logout: true })
})
router.get('/api/cart', verifyLogin, async (req, res) => {
  let username = req.session.user
  let user = req.session.user._id


  let cartCount = null
  if (req.session.user) {

    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let products = await userHelpers.getCartProducts(req.session.user._id);

  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.json({ products, user, total, cartCount, username }); // Pass the product details to the cart template

});


router.get('/api/add-to-cart/:id', verifyLogin, (req, res) => {
  console.log('api call done');

  let proId = req.params.id
  let userId = req.session.user._id
  userHelpers.addToCart(proId, userId).then((response) => {
    res.json(response)

  })
})
router.post('/api/change-productQuantity', (req, res) => {
  console.log('api call qq', req.body);

  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.get('/api/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.json({ user: req.session.user, total })
})
router.post('/api/place-order', verifyLogin, async (req, res) => {
  let proId = req.body.proId
  let addressId = req.body.addressId
  let user = req.session.user._id
  let buyNow = req.body.buyNow
  console.log('api call place', req.body, addressId);
  let address = await userHelpers.getOrderAddress(addressId, user)

  if (buyNow) {
    let product = await productHelpers.getProduct(proId)
    let total = product.Price

    userHelpers.addOrders(address, product, total, user, buyNow).then((response) => {
      res.json(response)
    })

  } else {

    let products = await userHelpers.getCartProducts(req.session.user._id)
    let totalPrice = await userHelpers.getTotalAmount(req.session.user._id)

    userHelpers.addOrders(address, products, totalPrice, user).then((response) => {
      res.json(response)
    })
  }


})





router.post('/api/buy-product', async (req, res) => {
  let proId = req.body.proId
  console.log('api buy', req.body);

  let product = await productHelpers.getProduct(proId)
  let total = product.Price
  console.log('total', total);

  res.json({ total, product })

})





router.get('/order-success', verifyLogin, (req, res) => {
  res.json('user/order-success')
})
router.get('/api/view-orders', verifyLogin, async (req, res) => {
  console.log('api call order');

  let orders = await userHelpers.getOrders(req.session.user._id)
  res.json({ user: req.session.user, orders })
})
router.get('/api/view-orders-products/:Id', verifyLogin, async (req, res) => {
  let orderId = req.params.Id
  let products = await userHelpers.getOrderedProducts(orderId)
  let ordertrack = await userHelpers.getTrackOrders(req.params.Id)
  console.log('orderid', orderId);
  console.log("products is ", products);
  console.log("Ordertrack is", ordertrack);

  res.json({ user: req.session.user, products, ordertrack })
})
router.get('/api/wishlist', verifyLogin, async (req, res) => {
  let wishlistItems = await userHelpers.getWishlistProducts(req.session.user._id)
  console.log("resolve", wishlistItems);

  res.json({ user: req.session.user, wishlistItems })
})
router.get('/api/add-to-Wishlist/:id', verifyLogin, (req, res) => {
  console.log("wish id is ", req.params.id);
  userHelpers.addToWishlist(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true, message: 'Wishlist updated' });
  })
})

router.post('/api/cancel-order', (req, res) => {
  console.log('canceled id', req.body)
  userHelpers.cancelOrder(req.body.orderId, req.session.user._id).then((response) => {
    res.json(response)
  })
})

router.post('/api/return-product', (req, res) => {
  const { proId, orderId, check, reason, message } = req.body.returndata;
  console.log('return', req.body);
  userHelpers.returnProduct(proId, orderId, check, reason, message).then((response) => {
    res.json(response)
  })

})


router.post('/api/get-user-details', (req, res) => {
  console.log('api call to get user details');

  console.log(req.session.user);
  res.json(req.session.user)

})

router.post('/api/edit-profile', (req, res) => {
  console.log('api call to edit ');

  let userId = req.session.user._id
  userHelpers.editProfile(userId, req.body).then((response) => {
    req.session.user = response
    console.log('ress new ', response);

    console.log('new sess', req.session.user);

    res.json({ status: true })
  })
})

router.get('/api/get-address', (req, res) => {
  console.log('api call to get address ');

  let userId = req.session.user._id
  userHelpers.getAddress(userId).then((response) => {
    res.json(response)
  })
})

router.post('/api/add-address', (req, res) => {
  console.log('data in add address', req.body);
  let userId = req.session.user._id
  userHelpers.addAddress(userId, req.body).then((response) => {
    res.json(response)
  })
})

router.post('/api/edit-user-address', (req, res) => {
  let userId = req.session.user._id
  console.log('edit address', req.body);
  userHelpers.editUserAddress(req.body, userId).then((response) => {
    console.log('edit response', response);
    res.json(response)
  })

})

router.post('/api/delete-address', (req, res) => {
  console.log('delete api clal', req.body);
  userHelpers.deleteAddress(req.body.addressId, req.session.user._id).then((response) => {
    res.json(response)
  })

})


router.get('/api/get-categories', (req, res) => {
  console.log('api call to get ctae ');

  productHelpers.getCategories().then((response) => {
    res.json(response)
  })
})


router.get('/api/find-category-:thing', (req, res) => {
  console.log('api call to find parm id ', req.params.thing);
  let thing = req.params.thing

  productHelpers.findCategory(thing).then((response) => {
    res.json(response)
  })

})


router.get('/api/get-product/:id', async (req, res) => {
  let proId = req.params.id
  console.log('id rp', proId);

  let product = await productHelpers.getProduct(proId)
  let wishlist = await userHelpers.getWishlist(req.session.user._id);

  product.isInWishlist = wishlist.products.some(item => item.item.toString() === product._id.toString());
  console.log('pro wish', product);

  res.json(product) 

})

router.get('/api/get-sliders', (req, res) => {
  userHelpers.getSlider().then((response) => {
    res.json(response)
  })
})

router.post('/api/contact-form', (req, res) => {

  
  console.log('api call to contact ', req.body);
 
  
  
  userHelpers.addContact(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/api/dummyAddToCart', (req, res) => {
  res.status(200).send({ success: true })
})
module.exports = router;
