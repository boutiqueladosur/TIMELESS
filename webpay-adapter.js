(()=>{
'use strict';
window.TIMELESS_WEBPAY={
  enabled:false,
  async createTransaction(){throw new Error('Webpay está desactivado en la configuración de la tienda.');},
  async confirmTransaction(){throw new Error('Webpay está desactivado en la configuración de la tienda.');}
};
})();