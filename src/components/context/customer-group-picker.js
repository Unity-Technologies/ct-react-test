import { useContext, useState, useEffect } from 'react';
import { apiRoot } from '../../commercetools';
import AppContext from '../../appContext';

function CustomerGroupPicker() {

  const [context, setContext] = useContext(AppContext);
  
  const onChangeCustomerGroup = (event) => {
    const customerGroupId = event.target.value;
    if(customerGroupId) {
      const customerGroupName = customerGroups.find(c => c.id == customerGroupId).name;

      setContext({
        ...context,
        customerGroupId:customerGroupId, 
        customerGroupName: customerGroupName
      });
      sessionStorage.setItem('customerGroupId',customerGroupId); 
      sessionStorage.setItem('customerGroupName',customerGroupName); 
    } else {setContext({
      ...context,
      customerGroupId:null, 
      customerGroupName: null
    });
      sessionStorage.removeItem('customerGroupId');
      sessionStorage.removeItem('customerGroupName');
    }
  }


  let [customerGroups, setCustomerGroups] = useState([]);
  let [cgFetched, setCGFetched] = useState(false);

  useEffect(() => {
    fetchCustomerGroups();
  });

  async function fetchCustomerGroups()  {
    // Avoid repeat calls
    if(cgFetched) {
      return;
    }
 
    let res =  await apiRoot
      .customerGroups()
      .get()
      .execute();

    if(res?.body?.results) {
      setCustomerGroups(res.body.results);
      setCGFetched(true);
    }
  };

  let customerGroupOptions = "";
  if(customerGroups.length) {
    customerGroupOptions = customerGroups.map(c => <option key={c.id} value={c.id}>{c.name}</option>);
   
  }

  const selected= context.customerGroupId ? context.customerGroupId : '';

  return (
    <div>
      Customer Group:&nbsp;&nbsp;  
      <select value={selected} onChange={onChangeCustomerGroup}>
        <option value="">(none selected)</option>
        {customerGroupOptions}
      </select>
    </div>
  );
      
}

export default CustomerGroupPicker;