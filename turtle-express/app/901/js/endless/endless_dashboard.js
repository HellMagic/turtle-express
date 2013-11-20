$(function	()	{

	//Morris Chart
	var overviewChart = Morris.Area({
	element: 'overviewChart',
	  data: [
		{ y: '2004', Item1: 2647, Item2: 0 ,Item3:2666 },
		{ y: '2005', Item1: 2778, Item2: 2294 ,Item3:2441 },
		{ y: '2006', Item1: 4912, Item2: 1969 ,Item3:2501 },
		{ y: '2007', Item1: 5689, Item2: 3597 ,Item3:3767 },
		{ y: '2008', Item1: 2293, Item2: 1914 ,Item3:6810 },
		{ y: '2009', Item1: 1881, Item2: 4293 ,Item3:5670 },
		{ y: '2010', Item1: 1588, Item2: 3795 ,Item3:4820 },
		{ y: '2011', Item1: 5174, Item2: 5967 ,Item3:15073 },
		{ y: '2012', Item1: 2028, Item2: 4460 ,Item3:10687 },
		{ y: '2013', Item1: 1791, Item2: 5713 ,Item3:8432 },
	  ],
	  xkey: 'y',
	  ykeys: ['Item1', 'Item2' , 'Item3'],
	  labels: ['Item1', 'Item2', 'Item3'],
	  lineColors: ['#A5C3F7','#999' ,'#9ad268']
	});
	
	var donutChart = Morris.Donut({
	  element: 'donutChart',
	  data: [
		{label: "Download Sales", value: 1236},
		{label: "In-Store Sales", value: 3091},
		{label: "Mail-Order Sales", value: 2781}
	  ],
	  colors: ['#999','#9ad268' ,'#a5c3f7']
	});
	
	var lineChart = Morris.Line({
		element: 'lineChart',
		data: [
			{ y: '2006', a: 30,  b: 20 },
			{ y: '2007', a: 45,  b: 35 },
			{ y: '2008', a: 60,  b: 60 },
			{ y: '2009', a: 75,  b: 65 },
			{ y: '2010', a: 50,  b: 70 },
			{ y: '2011', a: 80,  b: 85 },
			{ y: '2012', a: 100, b: 90 }
		],
		xkey: 'y',
		ykeys: ['a', 'b'],
		labels: ['Item A', 'Item B'],
		lineColors: ['#7ee1ff', '#1bc8fc'],
		gridTextColor : '#fff'
	});
	
	var barChart = Morris.Bar({
	  element: 'barChart',
	  data: [
		{ y: '2006', a: 100, b: 90 },
		{ y: '2007', a: 75,  b: 65 },
		{ y: '2008', a: 50,  b: 40 },
		{ y: '2009', a: 75,  b: 65 },
		{ y: '2010', a: 50,  b: 40 },
		{ y: '2011', a: 75,  b: 65 },
		{ y: '2012', a: 100, b: 90 }
	  ],
	  xkey: 'y',
	  ykeys: ['a', 'b'],
	  labels: ['Item C', 'Item D'],
	  barColors: ['#acec74', '#80c641'],
	  gridTextColor : '#fff'
	});

	//Sparkline
	$('#visits').sparkline([15,19,20,22,33,27,31,27,19,30,21,10,15,18,25,9], {
		type: 'bar', 
		barColor: '#fa4c38',	
		height:'35px',
		weight:'96px'
	});
	$('#balances').sparkline([220,160,189,156,201,220,104,242,221,111,164,242,183,165], {
		type: 'bar', 
		barColor: '#92cf5c',	
		height:'35px',
		weight:'96px'
	});
	
	//Timeline color box
	$('.timeline-img').colorbox({
		rel:'group1',
		width:"90%",
		maxWidth:'800px'
	});

	//Resize graph when toggle side menu
	$('.navbar-toggle').click(function()	{
		setTimeout(function() {
			overviewChart.redraw();
			donutChart.redraw();
			lineChart.redraw();
			barChart.redraw();			
		},500);	
	});
	
	$('.size-toggle').click(function()	{
		//resize morris chart
		setTimeout(function() {
			overviewChart.redraw();
			donutChart.redraw();
			lineChart.redraw();
			barChart.redraw();			
		},500);
	});
	
	$(window).resize(function(e)	{
		
		//Sparkline
		$('#visits').sparkline([15,19,20,22,33,27,31,27,19,30,21,10,15,18,25,9], {
			type: 'bar', 
			barColor: '#fa4c38',	
			height:'35px',
			weight:'96px'
		});
		$('#balances').sparkline([220,160,189,156,201,220,104,242,221,111,164,242,183,165], {
			type: 'bar', 
			barColor: '#92cf5c',	
			height:'35px',
			weight:'96px'
		});

		//resize morris chart
		setTimeout(function() {
			overviewChart.redraw();
			donutChart.redraw();
			lineChart.redraw();
			barChart.redraw();			
		},500);
	});
});
