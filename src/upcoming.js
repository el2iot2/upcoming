var upcoming = function(){
	var a = [1,2,3];
   function abc(){
     return (a[0]*a[1])+a[2]);
   }

   return {
      name: 'revealed',
      abcfn: abc
   }
}();