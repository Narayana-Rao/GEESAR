
/*

1. Import Sentinel-1 GRDH data
2. Convert the dB to linear scale and apply speckle filtering
3. Clip the data to desired region of interest
4. Plot the histogram of the sigma_0 (dB)
5. Export to drive

Author:Narayanarao Bhogapurapu
Web:https://Narayana-Rao.github.io

*/

var roi =   ee.Geometry.Polygon(
        [[[72.60950833177105, 19.412921358704814],
          [72.60950833177105, 18.75103203755674],
          [73.36207180833355, 18.75103203755674],
          [73.36207180833355, 19.412921358704814]]], null, false);
          
var S1_col = ee.ImageCollection('COPERNICUS/S1_GRD')
             .filterDate('2024-06-01', '2024-07-01') //Date filter
             .filter(ee.Filter.eq('instrumentMode', 'IW')) //Acquisition mode filter
             .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) //orbital pass filter
             .select('VV','VH','angle') //Selecting specific bands
             .sort('system:time_start', true) //sorting
             .filterBounds(roi); //Region filter
             

// masking
function maskS1(image) 
{
      var edge = image.lt(-30.0);
      var maskedImage = image.mask().and(edge.not());
      return image.updateMask(maskedImage);
}

var S1_col_masked = S1_col.map(maskS1);
// print(S1_col_masked);

// dB to linear conversion
function dB_to_linear(image) 
{
  var VV_linear = image.expression( '10 ** (VV / 10)', {'VV': image.select('VV')});
  var VH_linear = image.expression( '10 ** (VV / 10)', {'VV': image.select('VH')});
  return image.addBands([
      VV_linear.select(['constant'],['VV_linear']),
      VH_linear.select(['constant'],['VH_linear']),
      ]);
}


var S1_col_lin = S1_col_masked.map(dB_to_linear);

// print(S1_col_lin);

// speckle filtering
function boxcar(image) 
{
  var window_size = 1.5;
  var boxcar = ee.Kernel.square({radius: window_size, units: 'pixels'});
  return image.convolve(boxcar);
}

var S1_col_filt = S1_col_lin.map(boxcar);

// print(S1_col_filt);


//Data visualization
Map.centerObject(roi,10); //center the display area to roi at zoom level 12
Map.addLayer(ee.Image(S1_col_masked.select('VV').first()).clip(roi),{min:-15,max:0},'VV_dB'); // dB scale image
Map.addLayer(ee.Image(S1_col_lin.select('VV_linear').first()).clip(roi),{min:0.0316,max:0.5},'VV_linear'); //linear scale image
Map.addLayer(ee.Image(S1_col_filt.select('VV_linear').first()).clip(roi),{min:0.0316,max:0.5},'VV_linear_filtered'); //clip the image and display

var s1Img = ee.Image(S1_col_filt.select('VV_linear').first()).clip(roi)

//Data export
Export.image.toDrive({
  image: s1Img.select(['VV_linear']),
  description: 'Sentinel_1_VV',
  scale: 100,  // Set the scale (in meters)
  region: roi,  // Use the geometry of the image as the region to export
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineFolder'  // Optional: specify a folder in your Google Drive
});



// Plot histogram for HH polarization band
var histogram = ui.Chart.image.histogram({
  image: ee.Image(S1_col_filt.select('VV').first()),
  region: roi,  // Use the geometry as the region to plot
  scale: 100,  // Use the scale of the image (in meters)
  maxPixels: 1e9,  // Adjust max pixels to avoid too large data
  maxBuckets: 100 
});
histogram.setOptions({
  title: 'Histogram of VV (dB) Polarization',
  vAxis: {
    title: 'Frequency',  // Label for the vertical axis
    // viewWindow: {min: 0},  // Ensure the vAxis starts from 0
  },
  hAxis: {
    title: 'VV Backscatter',  // Label for the horizontal axis
    viewWindow: {min: -30,max:10}, 
  },
  colors: ['#1f77b4'],  // Optionally change the color of the histogram bars
  chartArea: {width: '80%', height: '70%'},  // Adjust chart area size for better view
});
print(histogram);

//END





