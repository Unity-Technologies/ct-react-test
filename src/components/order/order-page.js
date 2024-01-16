import { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { apiRoot } from '../../commercetools';
import ContextDisplay from '../context/context-display';

const VERBOSE=true;

const OrderPage = () => {

  let [order, setOrder] = useState(null);
  let [fetched, setFetched] = useState(false);

  useEffect(() => {
    getCurrentOrder();
  });

  const getCurrentOrder = async() => {
    if(fetched)
      return order;
    setFetched(true);
    setOrder(await fetchOrder());
  }

  const deleteOrder = async () => {
    let orderId = sessionStorage.getItem('orderId');

    const deleted = await apiRoot
      .orders()
      .withId({ID: orderId})
      .delete({
        queryArgs: {
          version: 1
        }
      })
      .execute();
    
    sessionStorage.removeItem('orderId');
    sessionStorage.removeItem('orderNumber');

    setOrder(null);
    setFetched(false)

    return deleted;
  }


  const fetchOrder = async() => {
    const orderId = sessionStorage.getItem('orderId');
    const orderNumber = sessionStorage.getItem('orderNumber');

    if(!orderId)
      return null;

    return {
      id: orderId,
      number: orderNumber
    };
  }
  
  if(!order) {
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
    <div>
      <ContextDisplay />
      
      <Container fluid>
        <Row>
          <Col>
            <h4>Order ID</h4>{order.id}
          </Col>
        </Row>
        <Row>
          <Col>
            <h4>Order Number</h4>
            {order.number}
            <br/>
            <button onClick={deleteOrder}>Delete</button>
          </Col>
        </Row> 
      </Container>         
    </div>
  )
}

export default OrderPage;
