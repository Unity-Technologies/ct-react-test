import { useContext, useEffect, useState } from 'react';
import AppContext from '../../appContext';
import axios from 'axios';
import { apiRoot, setAccessToken } from '../../commercetools';
import CommercetoolsLogin from './commercetools-login';
//import OktaLogin from './okta-login';
//import DummyLogin from './dummy-login';

const VERBOSE=true;


export const fetchGenesisUser = async (genesisUserId) => {
  const genesisUser = await axios.get(`${process.env.REACT_APP_URL_APP}/api/genesis-org/${genesisUserId}`);
  return genesisUser.data;
}

const AccountPage = () => {
  const [context, setContext] = useContext(AppContext);
  const [customer, setCustomer] = useState();

  useEffect(() => {
    fetchCustomer();
  });

    
  const fetchCustomer = async () => {
    const accessToken = sessionStorage.getItem('accessToken');
    // Avoid repeat calls
    if(customer) {
      if(accessToken) {
        setAccessToken(accessToken);
      }
      return customer;
    }

    if(!customer && accessToken) {
      setAccessToken(accessToken);

        let res =  await apiRoot
          .me()
          .get()
          .execute();

      if(res?.body) {
        setCustomer(res.body);
        setContext({...context, loggedIn: true});
      }
      return res?.body;
    }
    return null
  };

  if(!context.loggedIn) {
    return (
      <div>
        <CommercetoolsLogin/>
      </div>
    )
  }

  if(customer) {
    return (
      <div>
        <div>
          <h5>Customer</h5>
          Customer Name:  {customer.firstName} {customer.lastName}      
        </div>
        <div>
          <CommercetoolsLogin/>
        </div>
      </div>
    )
  }
  return null;
}

export default AccountPage;
