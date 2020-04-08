// const state = {
//   curPosition: null
// }

// const delay = (ms) => {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve()
//     }, ms)
//   })
// }

// function getCoords() {
//   if (navigator.geolocation) {
//     return new Promise(resolve => {
//       navigator.geolocation.getCurrentPosition(pos => {
//         state.curPosition = {
//           lon: pos.coords.longitude,
//           lat: pos.coords.latitude
//         }
//         resolve()
//       }, err => {
//         console.error(err.message)
//       }, {
//         enableHighAccuracy: true,
//         timeout: Infinity,
//         maximumAge: 0
//       })
//     })
//   } else {
//     console.error('Geolocation is not supported')
//   }
// }

// async function main() {
//   console.log('start')
//   await getCoords();
//   await delay(1500)
//   console.log(state)
//   console.log('end')
// }

// main()