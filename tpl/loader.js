(function( win, doc ){

	function fileExt(file){
		return file.split('.').pop();
	}

	function loader( file, func, target ){
		
		if( typeof file != 'object' ){
			file = [ file ];
		}
		
		//追加元素
		var target = ( target || document.querySelector('head') );
		var object = [];
		
		for( var i in file ){
		
			var type = fileExt( file[i] );
			var name, attr = {};
			
			switch( type ){
				case 'js':
					name = 'script';
					attr = { 'type' : 'text/javascript', 'src' : file[i] };
				break;
				case 'css':
					name = 'link';
					attr = { 'rel' : 'stylesheet', 'type' : 'text/css', 'href' : file[i] };
				break;				
				default:
					name = 'img';
					attr = { 'src' : file[i] };
				break;
			}
			
			var ele = document.createElement( name );				
			for( var k in attr ){
				ele[k] = attr[k];
			}
			
			element = target.appendChild( ele );						
			object.push( ele );
		
		}
		
		if( func ){
			element.bind('load', function(){
				func.apply( target, object );
			});		
		}
	
	}
	
/**PLACEHOLDER**/

})( window, document );