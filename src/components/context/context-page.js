import ContextDisplay from './context-display';
import CurrencyPicker from './currency-picker';
import CountryPicker from './country-picker';
import ChannelPicker from './channel-picker';
import StorePicker from './store-picker';
import CustomerGroupPicker from './customer-group-picker';

function ContextPage() {

  return (
    <div>
      <ContextDisplay />
      Make selections here to influence price selection logic.<br></br>
      If no currency is selected, then all prices will be displayed.
      <p></p>

      <CurrencyPicker />
      <p></p>

      <CountryPicker />
      <p></p>
      
      <ChannelPicker />
      <p></p>

      <StorePicker />
      <p></p>

     <CustomerGroupPicker />
    </div>
  );
      
}

export default ContextPage;