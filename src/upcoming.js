var upcoming = function(){
	var a = [1,2,3];
   function _render(){
     return (a[0]*a[1])+a[2]);
   }

   return {
      name: 'revealed',
      render: _render
   }
}();