import { apiRoot } from '../commercetools';
import { getCart, getCustomer, getCartById } from './cart-util';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Fetch cart from commercetools, expanding all discount references for display purposes

const queryArgs = {expand: [
    'lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount',
    'lineItems[*].price.discounted.discount',
  ]};

export const fetchGenesisUser = async (genesisUserId) => {
  const genesisUser = await axios.get(`${process.env.REACT_APP_URL_APP}/api/genesis-org/${genesisUserId}`);
  return genesisUser.data;
}

export const createPayment = async(cartId, paymentParams) => {
  if(!cartId)
    throw Error("Cannot create payment without cartId");
    let cart = await getCartById(cartId);
  const getPaymentMethodsRequest = {
    countryCode: paymentParams.countryCode,
    shopperLocale: "en-US",
    shopperReference: paymentParams.selectedGenesisOrgId.toString(),
    amount: {
        currency: paymentParams.currencyCode,
        value: paymentParams.centAmount
    }
  }
  
  let res =  await apiRoot
    .payments()
    .post({
        body: {
            amountPlanned : {
              currencyCode: paymentParams.currencyCode,
              centAmount : paymentParams.centAmount
            },
            paymentMethodInfo: {
                paymentInterface: "ctp-adyen-integration"
              },
            custom: {
                type: {
                  typeId: "type",
                  key: "ctp-adyen-integration-web-components-payment-type"
                },
                fields: {
                  getPaymentMethodsRequest: JSON.stringify(getPaymentMethodsRequest),
                }
            }
        }
    })
    .execute();
    if(res?.body) {
        return res.body;
    } else {
        throw Error("No payment returned");
    }
}

// 
export const addPaymentToCart = async(payment) => {
  let cart = await getCart();
  let customer = await getCustomer();
  const genesisUser = await fetchGenesisUser(process.env.REACT_APP_SELECTED_ORG_ID);
  console.log("customer", genesisUser, customer)
  if(!cart || !genesisUser || genesisUser.addressList.length==0 || customer.billingAddressIds.length==0)
    return;
  
  const shippingAddressId = genesisUser.addressList[0].id;
  const billingAddressId = customer.defaultBillingAddressId ? customer.defaultBillingAddressId : customer.billingAddressIds[0];
  let actions;
  if(process.env.REACT_APP_AVALARA_READY === "true") {
    actions = [{
      action: 'addPayment',
      payment: {
        id: payment.id,
        typeId: "payment"
      }
    },
    {
      action: 'setShippingAddress',
      address: {
        country: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.country,
        city: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.locality,
        state: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.region,
        firstName: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.firstName,
        lastName: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.lastName,
        streetName: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.streetAddress,
        //streetNumber: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.streetNumber,
        postalCode: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.postalCode,
        email: genesisUser.addressList.find((address) => address.id === shippingAddressId)?.email,

      }
    },
    {
      action: 'setBillingAddress',
      address: {
        country: customer.addresses.find((address) => address.id === billingAddressId)?.country,
        city: customer.addresses.find((address) => address.id === billingAddressId)?.city,
        state: customer.addresses.find((address) => address.id === billingAddressId)?.state,
        firstName: customer.addresses.find((address) => address.id === billingAddressId)?.firstName,
        lastName: customer.addresses.find((address) => address.id === billingAddressId)?.lastName,
        streetName: customer.addresses.find((address) => address.id === billingAddressId)?.streetName,
        streetNumber: customer.addresses.find((address) => address.id === billingAddressId)?.streetNumber,
        postalCode:customer.addresses.find((address) => address.id === billingAddressId)?.postalCode,
        email: customer.addresses.find((address) => address.id === billingAddressId)?.email,
      }
    }]
  } else {
    actions = [{
      action: 'addPayment',
      payment: {
        id: payment.id,
        typeId: "payment"
      }
    },
    {
      action: 'setShippingAddress',
      address: {
        country: customer.addresses.find((address) => address.id === shippingAddressId)?.country,
      }
    },
    {
      action: 'setBillingAddress',
      address: {
        country: customer.addresses.find((address) => address.id === billingAddressId)?.country,
      }
    }]
  }
  let res =  await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      queryArgs: queryArgs,
      body: {
        version: cart.version,
        actions
      }
    })
    .execute()
    .catch((e) => {
      console.log("ERROR",e);
      cart.error = e.message;
      throw Error (e.message)
    });

  if(res?.body) {
    return res.body;
  }
  return cart;
}

export const removePaymentToCart = async(paymentId) => {
  let cart = await getCart();

  let res =  await apiRoot
    .carts()
    .withId({ ID: cart.id })
    .post({
      queryArgs: queryArgs,
      body: {
        version: cart.version,
        actions: [{
          action: 'removePayment',
          payment: {
            id: paymentId,
            typeId: "payment"
          }
        }]
      }
    })
    .execute()
    .catch((e) => {
      console.log("ERROR",e);
      cart.error = e.message;
    });

  if(res?.body) {
    return res.body;
  }
  return cart;
}

export const createSessionRequest = async(payment, paymentParams) => {
    if(!payment)
      throw Error("Cannot create session without payment");
    
    const orderRef = uuidv4();
    const localhost = process.env.NODE_ENV === 'test' ? 'localhost:3000' : 'somethingelse';
    const protocol = process.env.NODE_ENV === 'test' ? 'http' : 'https';

    const createSessionRequest = {
        amount: { currency: paymentParams.currencyCode, value: paymentParams.centAmount },
        countryCode: paymentParams.countryCode,
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
        reference: orderRef, // required: your Payment Reference. Random UUID?
        returnUrl: `${protocol}://${localhost}/checkout?orderRef=${orderRef}`, // set redirect URL required for some payment methods (ie iDEAL)
        lineItems: paymentParams.lineItems,
        shopperReference: paymentParams.selectedGenesisOrgId.toString(),
        shopperInteraction: 'Ecommerce',
        recurringProcessingModel: 'CardOnFile',
        storePaymentMethod: true,
      };
    let res =  await apiRoot
      .payments()
      .withId({ ID: payment.id })
      .post({
        queryArgs: queryArgs,
        body: {
          version: payment.version,
          actions: [{
              action: 'setCustomField',
              name: "createSessionRequest",
              value: JSON.stringify(createSessionRequest)
            }]
        }
      })
      .execute()
      .catch((e) => {
        console.log("ERROR",e);
        throw Error(e.message);
      });
  
    if(res?.body) {
      return res.body;
    }
    return;
  }


  export const checkPayment = async(paymentId) => {
    if(!paymentId)
      throw Error("Cannot check payment without id");

    let res =  await apiRoot
      .payments()
      .withId({ ID: paymentId })
      .get()
      .execute()
      .catch((e) => {
        console.log("ERROR",e);
        throw Error(e.message);
      });
  
    if(res?.body) {
      return res.body;
    }
    return;
  }

export const createOrder = async(cart) => {
  console.log(cart);

  let res =  await apiRoot
  .orders()
  .post({         
    body: {
        cart: {
            typeId: "cart",
            id: cart.id,
        },
        // taxMode: "External"
        version: cart.version,
    }
  })
  .execute()
  .catch((e) => {
    console.log("ERROR",e);
    cart.error = e.message;
  });
  if(res?.body) {
    return res.body;
  }
  return;
}