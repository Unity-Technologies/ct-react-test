import { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { withRouter } from "react-router";
import { apiRoot, setAccessToken } from '../../commercetools';
import { getCart, updateCart } from '../../util/cart-util';
import ContextDisplay from '../context/context-display';
import LineItemInfo from './line-item-info';
import LineItemPriceInfo from './line-item-price-info';

const VERBOSE=true;

const CartPage = props => {
  let [cart, setCart] = useState(null);
  let [refresh, setRefresh] = useState();
  let [fetched, setFetched] = useState(false);

  const currency = sessionStorage.getItem('currency');

  useEffect(() => {
    if(!isCustomerLoggedIn())
    {
      props.history.push('/account');
    }
    getCurrentCart();
  });

  const getCurrentCart = async() => {
    if(fetched)
      return cart;
    setFetched(true);
    setCart(await getCart());
  }

  const isCustomerLoggedIn = () => {
    const accessToken = sessionStorage.getItem('accessToken');
    if(!accessToken) {
      return false;
    }
    setAccessToken(accessToken);
    return true
  };

  if(!cart) {
    return (
      <Container fluid>
        <Row>
          <Col>
            no cart.
          </Col>
        </Row>

      </Container>
    )
  }

  const getTotalTaxes = (cart) => {
    let total = {
      centAmount: 0,
      currencyCode: currency
    }
    if(!cart) {
      return 0;
    }
    console.log("totalTax", cart)
    total.centAmount = cart.taxedPrice?.totalTax?.centAmount || 0;
    return total;
  }

  const totalTaxes = getTotalTaxes(cart);

  const updateCartAndRefresh = async (action) => {
    setCart(await updateCart(action));
  }

  const incrementQuantity = async (lineItem) => {
    const action = {
      action: 'changeLineItemQuantity',
      lineItemId: lineItem.id,
      quantity: lineItem.quantity + 1
    }
    if(lineItem.priceMode=='ExternalPrice') {
      action.externalPrice = lineItem.price.value;
    }
    updateCartAndRefresh(action);
  }

  const addAddon = async () => {
    const cart = await getCart();
    setCart(cart);
  }
  
  const decrementQuantity = async (lineItem) => {
    const action = {
      action: 'changeLineItemQuantity',
      lineItemId: lineItem.id,
      quantity: lineItem.quantity - 1
    }
    updateCartAndRefresh(action);
  }

  const addDiscountCode = async () => {
    const discountCode=document.getElementById('discountCode').value;
    const action = {
      action: 'addDiscountCode',
      code: discountCode
    }
    updateCartAndRefresh(action);
  }

  const addCustomerEmail = async () => {
    const customerEmail=document.getElementById('customerEmail').value;
    const action = {
      action: 'setCustomerEmail',
      email: customerEmail
    }
    updateCartAndRefresh(action);
  }

  const deleteCart = async() => {
    let cart = await getCart();
    sessionStorage.removeItem('cartId');
    setCart(null);    
    if(cart) {
      apiRoot
        .carts()
        .withId({ ID: cart.id})
        .delete({
          queryArgs: {
            version: cart.version
          }
        })
        .execute();
    }
  }

  const checkout = async() => {
      props.history.push('/payment');
  }

  return (
    <div>
      <ContextDisplay />
      
      <Container fluid>
        <Row>
          <Col>
            <h4>Cart</h4>
            { cart.error && (
              <h5><font color="red">{cart.error}</font></h5>
            )}
          </Col>
        </Row>
        <Row>
          &nbsp;
        </Row>
        <Row>
          <Col>
          <h4>Line Items</h4>
          </Col>
        </Row>
      </Container>
      <Container>
        <Row>
          <Col><span className="heading">Quantity</span></Col>
          <Col><span className="heading">SKU</span></Col>
          <Col><span className="heading">Name</span></Col>
          <Col><span className="heading">Unit Price</span></Col>
          <Col><span className="heading">Taxes</span></Col>
          <Col><span className="heading">Total Price</span></Col>
        </Row>

        { cart.lineItems.map((lineItem,index) => <LineItemInfo 
                                                  key={index} 
                                                  lineItem={lineItem} 
                                                  increment={incrementQuantity.bind(null,lineItem)} 
                                                  decrement={decrementQuantity.bind(null,lineItem)} 
                                                  addAddon={addAddon.bind()}
                                                  lineItems={cart.lineItems}
                                                 /> )}                                           
        <Row>
          <Col>
            Add Discount Code: <input id="discountCode" type="text"></input> <button onClick={addDiscountCode}>Add</button>
          </Col>
        </Row>
        <hr></hr>
        <Row>
          <Col md={10}>
            <h6>Taxes</h6> 
          </Col>
          <Col>
            <LineItemPriceInfo price={totalTaxes}/>
          </Col>
        </Row>
        <hr></hr>
        <Row>
          <Col md={10}>
            <h4>Cart Total</h4> 
          </Col>
          <Col>
            <LineItemPriceInfo price={cart.taxedPrice?.totalGross || cart.totalPrice}/>
          </Col>
        </Row>
        <Row>
          <Col>
            <button type="button" onClick={checkout}>Check Out</button>     
          </Col>
          <Col>
            <button type="button" onClick={deleteCart}>Delete Cart</button>
          </Col>
        </Row>
        <Row>&nbsp;</Row>
      </Container>
      <Container fluid>
        <Row>
          <Col><h4>Metadata</h4>
            Cart ID {cart.id}
            <br/>version {cart.version}
            <br/>createdAt: { cart.createdAt}
            <br/>lastModifiedAt: { cart.lastModifiedAt }
            <br/>customerEmail: { cart.customerEmail } 
            <br/> <input id="customerEmail" type="text" placeholder="SetCustomerEmail"></input> <button onClick={addCustomerEmail}>Set</button>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default withRouter(CartPage);
