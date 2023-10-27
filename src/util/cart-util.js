import { apiRoot } from '../commercetools';

let VERBOSE=true;

// Fetch cart from commercetools, expanding all discount references for display purposes

const queryArgs = {expand: [
    'lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount',
    'lineItems[*].price.discounted.discount',
  ]};

export const getCart = async() => {
  const cartId = sessionStorage.getItem('cartId');
  if(!cartId)
    return null;
  
  let res =  await apiRoot
    .me()
    .carts()
    .withId({ ID: cartId })
    .get({ queryArgs: queryArgs })
    .execute();

  if(res?.body && res.body.cartState=='Active') {
    let recalculatedCart = await apiRoot
        .me()
        .carts()
        .withId({ ID: cartId })
        .post({
          queryArgs: queryArgs,
          body: {
            version: res.body.version,
            actions: [
              {
                action: "recalculate",
                updateProductData: true,
              }
            ]
          }
        })
        .execute()
    return recalculatedCart.body;
  }
  return null;
}

export const getCartById = async(cartId) => {
  if(!cartId)
    return null;
  
  let res =  await apiRoot
    .me()
    .carts()
    .withId({ ID: cartId })
    .get({ queryArgs: queryArgs })
    .execute();

  return res?.body;
}

export const getCustomer = async() => {
  
  let res =  await apiRoot
  .me()
  .get()
  .execute();
  if(res?.body) {
    return res?.body;
  }
  return null;
}

// return the cart after update
export const updateCart = async(actions) => {
  if(!Array.isArray(actions)) {
    actions = [ actions ];
  }

  console.log('actions',actions);

  let cart = await getCart();
  if(!cart)
    return;

  let res =  await apiRoot
    .me()
    .carts()
    .withId({ ID: cart.id })
    .post({
      queryArgs: queryArgs,
      body: {
        version: cart.version,
        actions: actions
      }
    })
    .execute()
    .catch((e) => {
      // HACK - stick the error message on the cart.
      console.log("ERROR",e);
      cart.error = e.message;
    });

  if(res?.body) {
    return res.body;
  }
  return cart;
}

export const addToCart = async (productId, variantId, custom) => {

  const currency = sessionStorage.getItem('currency');
  const country = sessionStorage.getItem('country');
  const channelId = sessionStorage.getItem('channelId');
  const customerGroupId = sessionStorage.getItem('customerGroupId');
  const storeKey = sessionStorage.getItem('storeKey');

  let cart;
  let result;
  const lineItem = {
    productId,
    variantId
  };
  if(channelId) {
    lineItem.distributionChannel={
      id: channelId,
      typeId: 'channel'
    }
  }
  // Add custom fields, if any
  lineItem.custom = custom;
  
  // Fetch current cart, if any.  Swallow error (TODO: check 404)
  const cartId = sessionStorage.getItem('cartId');

  console.log("found CartId", cartId);
  if(cartId) {
    result = await apiRoot
    .me()
    .carts()
    .withId({ ID: cartId })
    .get()
    .execute()
    .catch( (error) => { console.log('err',error) } );
    cart = result && result.body;
    if(cart) {
      sessionStorage.setItem('cartId',cart.id);
    }
  }

  if(cart) {
    if (!cart.isTaxExempt && process.env.REACT_APP_AVALARA_READY  === "true") {
      cart = await addTaxFields(cart.id || cart.body?.id, cart.version || cart.body.version);
    }
    console.log("addedTaxFields", cart);
    // add item to current cart
    console.log('Adding to current cart',cart.id,cart.version);
    if (!cart.shippingAddress?.city && process.env.REACT_APP_AVALARA_READY  === "true") {
      const customer = await getCustomer();
      cart = await addAddress(customer, cart.id || cart.body?.id, cart.version || cart.body.version);
    }
    console.log("cartAddress",cart);
    if (!cart.genesisOrgId && process.env.REACT_APP_AVALARA_READY  === "true") {
      cart = await addGenesisOrgId(cart.id || cart.body?.id, cart.version || cart.body?.version);
    }
    console.log("cartOrgId",cart);
    if(!cart.genesisOrgName && process.env.REACT_APP_AVALARA_READY  === "true") {
      cart = await addGenesisOrgName(cart.id || cart.body?.id, cart.version || cart.body?.version);
    }
    console.log("cartGenesisOrgName",cart);
    const cartId = cart.id || cart.body?.id;
    const cartVersion = cart.version || cart.body?.version;
    console.log("Cart Update Line Items",cartId )
    console.log("cartPayload", {
      version: cartVersion,
      actions: [{
        action: 'addLineItem',
        ...lineItem
      },]
    })
    result = await apiRoot
      .me()
      .carts()
      .withId({ID: cartId})
      .post({
        body: {
          version: cartVersion,
          actions: [{
            action: 'addLineItem',
            ...lineItem
          }]
        }
    }).execute();
  } else {
    console.log("creating a new cart")
    // Create cart and add item in one go. Save cart id
    let taxMode = "Platform";
    if(process.env.REACT_APP_AVALARA_READY  === "true") {
      taxMode= "External"
    }
    const createCartBody = {
      currency: currency,
      lineItems: [lineItem],
      taxMode,
    };
    if(country) {
      createCartBody.country = country;
    }
    if(customerGroupId) {
      createCartBody.customerGroup = {
        typeId: 'customer-group',
        id: customerGroupId,
      }
    }
    if(storeKey) {
      createCartBody.store = {
        typeId: 'store',
        key: storeKey,
      }
    }
    if(process.env.REACT_APP_AVALARA_READY  === "true") {
      createCartBody.custom = {
        type: {
          key: "cart-order-custom-type-information",
          typeId: "type"
        }
      }
    }
    console.log("createCartBody", createCartBody);
    result = await apiRoot
      .me()
      .carts()
      .post({
        body: createCartBody
      })
      .execute();
    if (!result.isTaxExempt && process.env.REACT_APP_AVALARA_READY  === "true") {
        result = await addTaxFields(result.id || result.body.id, result.version || result.body?.version);
      }
      console.log("addedTaxFields", result);
    if (!result.shippingAddress?.city && process.env.REACT_APP_AVALARA_READY  === "true") {
      const customer = await getCustomer();
      result = await addAddress(customer, result.id || result.body?.id, result.version || result.body?.version);
    }
    console.log("shippingAddress", result)
    if (!result.genesisOrgId && process.env.REACT_APP_AVALARA_READY  === "true") {
      result = await addGenesisOrgId(result.id || result.body.id, result.version || result.body.version);
    }
    if(!result.genesisOrgName && process.env.REACT_APP_AVALARA_READY  === "true") {
      result = await addGenesisOrgName(result.id || result.body.id, result.version || result.body.version);
    }
    console.log("genesisOrg", result);
  }
  if(result) {
    console.log('create cart result',result);
    sessionStorage.setItem('cartId',result.body.id);
  }
  return result;
}

const addAddress = async (customer, cartId, cartVersion) => {
      const shippingAddressId = customer.defaultShippingAddressId ? customer.defaultShippingAddressId : customer.shippingAddressIds[0];
      return apiRoot
      .me()
      .carts()
      .withId({ID: cartId})
      .post({
        body: {
          version: cartVersion,
          actions: [{
            action: 'setShippingAddress',
            address: {
              country: customer.addresses.find((address) => address.id === shippingAddressId)?.country,
              city: customer.addresses.find((address) => address.id === shippingAddressId)?.city,
              state: customer.addresses.find((address) => address.id === shippingAddressId)?.state,
              firstName: customer.addresses.find((address) => address.id === shippingAddressId)?.firstName,
              lastName: customer.addresses.find((address) => address.id === shippingAddressId)?.lastName,
              streetName: customer.addresses.find((address) => address.id === shippingAddressId)?.streetName,
              streetNumber: customer.addresses.find((address) => address.id === shippingAddressId)?.streetNumber,
              postalCode: customer.addresses.find((address) => address.id === shippingAddressId)?.postalCode,
            }
          }]
        }
      }).execute();
}

const addGenesisOrgId = async (cartId, cartVersion) => {
  console.log("genesisOrgId", Number(process.env.REACT_APP_SELECTED_ORG_ID))
  return await apiRoot
      .me()
      .carts()
      .withId({ID: cartId})
      .post({
        body: {
          version: cartVersion,
          actions: [{
            action: "setCustomField",
            name: "selectedGenesisOrgId",
            value: Number(process.env.REACT_APP_SELECTED_ORG_ID)
            }]
        }
      }).execute();
}

const addGenesisOrgName = async (cartId, cartVersion) => {
  console.log("genesisOrgName", process.env.REACT_APP_SELECTED_ORG_NAME)
  return await apiRoot
      .me()
      .carts()
      .withId({ID: cartId})
      .post({
        body: {
          version: cartVersion,
          actions: [{
            action: "setCustomField",
            name: "selectedGenesisOrgName",
            value: process.env.REACT_APP_SELECTED_ORG_NAME
            }]
        }
      }).execute();
}

const addTaxFields = async (cartId, cartVersion) => {
  console.log("addTaxFields", process.env.REACT_APP_SELECTED_ORG_NAME)
  return await apiRoot
      .me()
      .carts()
      .withId({ID: cartId})
      .post({
        body: {
          version: cartVersion,
          actions: [{
            action: "setCustomField",
            name: "isTaxExempt",
            value: false
            },
            {
              action: "setCustomField",
              name: "taxExemptCertificate",
              value: ""
            },
            {
              action: "setCustomField",
              name: "taxExemptReasonCode",
              value: ""
            },
            {
              action: "setCustomField",
              name: "vatId",
              value: ""
            }
          ]
        }
      }).execute();
}