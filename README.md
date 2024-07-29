**VOO CART DRAWER**

**Available features:**
1. _**Sticky cart.**_
   <br>Sticky cart with counter opens/closes the cart drawer. You can configure its placement or disable it entirely.
2. _**Announcement bar.**_
   <br>You can specify up to three messages for the user. These messages may include a timer (to encourage purchase) or a discount code that the user could easily copy by clicking.
3. _**Cart items.**_
   <br>Movable block to discplay items in cart. No customizable settings.
4. _**Free gift.**_
   <br>Allows the user to get free gift when order total threshold is reached. To enable the Free Gift feature:
   - configure discount 'Buy X, Get Y' in the admin panel;
   - specify the product variant ID for the free item, and set the order amount required to receive the free product.
5. _**BOGO (Buy one - get one).**_
   <br>Up to 2 product pairs can be added. A product pair consists of Product X and Product Y. This means that by purchasing Product X, the user will receive Product Y as a gift (for free). If 2 pairs are activated, the user can choose one gift item.
   <br><br>In addition to the products (X and Y) themselves, you can specify the variants of these products in the customizer to which the offer applies. If specified, the gift will only be offered if the user adds a product from the listed variants to the cart (only those variants of Product Y specified in the customizer will be available as gifts). If no variants are specified, all variants of the product are considered eligible for the offer.
   <br><br>In the admin panel, you need to set up the corresponding discount (buy X, get Y) for each pair.
6. _**Recommendations.**_
    <br>Set up recommendations as product list in customizer or use recommendation API.
7. _**Reward bar.**_
   <br>Upon reaching a certain order total, the user can receive various rewards. In the customizer, you can configure the visual elements to allow the user to track these rewards. However, the discount logic is managed through the admin panel.
   For this block, you can set up to 3 rewards, each with a name and the total amount required (in the store's currency).
8. _**Discount applicator.**_
    <br>Field for entering a promo code to apply discounts to the order.

General settings also include options for customizing the basic styling. 

**Implementation**
1. Add _"voo-cart-darwer.js"_, _"voo-cart-drawer.css"_ files to assets folder.
2. Add _"siema.min.js"_ to assets folder for sliders.
3. Add _"voo-cart-drawer.liquid"_ files to sections folder.
4. Add section to header group or render it in _theme.liquid_ layout using section tag _{% section 'voo-cart-drawer' %}_.
5. Configure the settings in the customizer according to your needs, add the necessary blocks (including Cart Items), and test the functionality. To ensure changes take effect during customization, refresh the store page after making updates in customizer.

   
