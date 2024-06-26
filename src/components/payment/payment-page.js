// @ts-check

import AdyenCheckout from '@adyen/adyen-web';
import '@adyen/adyen-web/dist/adyen.css';
import React, { useEffect, useRef, useState } from "react";
import { Col, Container, Row } from 'react-bootstrap';
import { withRouter } from "react-router";
import { setAccessToken } from '../../commercetools';
import { getCart } from '../../util/cart-util';
import { addPaymentToCart, checkPayment, createPayment, createSessionRequest, getCreatedOrderByCartId } from '../../util/payment-util';

const URL_APP = 'http://localhost:3001';


const AdyenForm = props => {
  const [isLoadingTransaction, setLoadingTransaction] = useState(false);
  const paymentContainer = useRef(null);

  useEffect(() => {
    if(!isCustomerLoggedIn())
    {
      props.history.push('/account');
    }
  });

  const isCustomerLoggedIn = () => {
    const accessToken = sessionStorage.getItem('accessToken');
    if(!accessToken) {
      return false;
    }
    setAccessToken(accessToken);
    return true
  };

  useEffect(() => {
    let hasRun = false;

    const createCheckout = async () => {
      if (hasRun) return;

      let cart = await getCart();
      if (!cart)  throw Error("Cart not found!")

      const currency = cart?.totalPrice.currencyCode;
      const countryCode = cart?.shippingAddress?.country;
      const price =  cart?.taxedPrice?.totalGross?.centAmount; // value is 100€ in minor units
      const lineItems = cart?.lineItems.map((item) => {
        return {  
          id: item.id,
          description: item.name['en-US'],
          quantity: item.quantity,
          amountIncludingTax: item.totalPrice.centAmount,
          sku: item.variant.sku,
        }});
      const paymentParams = {
        selectedGenesisOrgId: cart.custom?.fields?.selectedGenesisOrgId,
        currencyCode: currency,
        centAmount: price,
        countryCode,
        shopperLocale: "en-US",
        lineItems
      }
      let payment;
      if(cart.paymentInfo && cart.paymentInfo.payments && cart.paymentInfo.payments.length > 0) {
        console.log("payment existed" )
        payment = await checkPayment(cart.paymentInfo.payments[0].id);
      } else {
        console.log("create payment")
        payment = await createPayment(cart.id, paymentParams)
        cart = await addPaymentToCart(payment) || null;
        console.log("cartResult", cart)
      }
      const sessionRequestPayment = await createSessionRequest(payment, paymentParams);
      if(!sessionRequestPayment) throw Error("No session request returned");
      console.log("sessionRequestPayment", sessionRequestPayment);

      /*const session = await axios.post(`${URL_APP}/api/sessions`, {
        currencyCode: currency,
        centAmount: price,
        countryCode,
      });*/
      const parsedSession = JSON.parse(sessionRequestPayment.custom?.fields.createSessionResponse);
      console.log("parsedSession", parsedSession)
      const parsedPaymentMethodsResponse = JSON.parse(sessionRequestPayment.custom?.fields?.getPaymentMethodsResponse);
      const checkout = await AdyenCheckout({
        session: parsedSession,
        clientKey: process.env.REACT_APP_ADYEN_CLIENT_KEY, // Web Drop-in versions before 3.10.1 use originKey instead of clientKey.
        locale: 'en-US',
        environment: process.env.REACT_APP_ENV === 'prd' ?  'live' : 'test',
        paymentMethodsResponse: parsedPaymentMethodsResponse,
        onPaymentCompleted: async (result, component) => {
          console.log("Session Data", parsedSession.id)
          console.info("Payment Complete", result, component);
          if(result.resultCode === 'Authorised') {
            let transaction = null
            while(!transaction) {
              const paymentInfo = await checkPayment(sessionRequestPayment.id);
              console.log("paymentInfo", paymentInfo);
              if(paymentInfo && paymentInfo.transactions.length > 0) {
                // @ts-ignore
                transaction = paymentInfo?.transactions?.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                if(transaction[0]) {
                  const transactionId = transaction[0].id;
                  console.log("transactionId", transactionId);
                  const cartId = sessionStorage.getItem('cartId');
                  if(!cartId) throw Error("Cart not found!");
                  let createdOrderArray = await getCreatedOrderByCartId(cartId);
                  while(!createdOrderArray || createdOrderArray.count === 0 ) {
                    setLoadingTransaction(true);
                    await transactionTimeoutAwait(2000);
                    createdOrderArray = await getCreatedOrderByCartId(cartId);
                    
                  }
                  const createdOrder = createdOrderArray.results[0]
                  sessionStorage.removeItem("cartId");
                  sessionStorage.setItem('orderId', createdOrder.id);
                  sessionStorage.setItem('orderNumber', createdOrder.orderNumber ? createdOrder.orderNumber : '');
                  props.history.push('/order');
                }
              }
              setLoadingTransaction(true);
              await transactionTimeoutAwait(2000);
            }
          }
          console.log("Payment Complete");
      },
      });

      if (paymentContainer.current) {
        checkout.create('dropin').mount(paymentContainer.current);
      }
    };

    createCheckout();

    // eslint-disable-next-line consistent-return
    return () => {
      hasRun = true;
    };
  }, []);

  if(isLoadingTransaction) {
    return (
      <Container fluid>
        <Row>
          <Col>
            no current order.
          </Col>
        </Row>

      </Container>
    ) 
  }

  return (
    <>
      <div ref={paymentContainer} />
    </>
  );
};

function transactionTimeoutAwait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default withRouter(AdyenForm);

//export default AdyenForm;

/*


class PaymentPage extends Component {
  constructor(props) {
    super(props);
    this.initAdyenCheckout = this.initAdyenCheckout.bind(this);
  }

  componentDidMount() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/3.0.0/adyen.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/3.0.0/adyen.js";
    script.async = true;
    script.onload = this.initAdyenCheckout; // Wait until the script is loaded before initiating AdyenCheckout
    document.body.appendChild(script);
  }

  async initAdyenCheckout() {

    const session = await createPaymentSession();


    // You can add AdyenCheckout to your list of globals and then delete the window reference:
    // const checkout = new AdyenCheckout(configuration);

    const checkout = await AdyenCheckout({
      session,
      clientKey: ADYEN_CLIENT_KEY, // Web Drop-in versions before 3.10.1 use originKey instead of clientKey.
      paymentMethodsResponse: paymentMethodsMock,
      locale: 'en-US',
      environment: 'test',
    });


    // If you need to refer to the dropin externaly, you can save this inside a variable:
    // const dropin = checkout.create...
    checkout.create("dropin").mount(paymentContainer.current);
  }

  render() {
    return (
      <div
        ref={ref => {
          this.ref = ref;
        }}
      />
    );
  }
}

export default withRouter(PaymentPage);

*/



