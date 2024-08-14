import Web3 from 'web3';

//! Doesn't seem to be grabbing any events. Tried moving from factory address to the pool address.
// It seems to log the connection but nothing after that.

// Use WebSocket provider for real-time subscriptions
const ETHEREUM_WS_URL = 'wss://mainnet.infura.io/ws/v3/277b1448bf884eb98cd702b7911a04cc';
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_POOL_ADDRESS = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640'; // ETH/USDC 0.05% pool

// Create a new web3 instance with WebSocket provider
const web3 = new Web3(new Web3.providers.WebsocketProvider(ETHEREUM_WS_URL));

// Function to handle Uniswap events
const eventSignature = "Swap(address,address,int256,int256,uint160,uint128,int24)";
const eventTopic = web3.utils.keccak256(eventSignature);

const decodeSwapEvent = (log) => {
    const topics = log.topics;
    const data = log.data;

    const decodedData = web3.eth.abi.decodeLog([
        { type: 'address', name: 'sender', indexed: true },
        { type: 'address', name: 'recipient', indexed: true },
        { type: 'int256', name: 'amount0' },
        { type: 'int256', name: 'amount1' },
        { type: 'uint160', name: 'sqrtPriceX96' },
        { type: 'uint128', name: 'liquidity' },
        { type: 'int24', name: 'tick' }
    ], data, [topics[1], topics[2]]);

    return decodedData;
};

const subscribeToUniswapEvents = () => {
    console.log('Subscribing to Uniswap events...');
    return web3.eth.subscribe('logs', {
        address: UNISWAP_V3_POOL_ADDRESS,
        topics: [eventTopic]
    }, (error, log) => {
        if (error) {
            console.error('Subscription error:', error);
        } else {
            console.log('Received log:', log);  // Log the raw event
            const decodedEvent = decodeSwapEvent(log);
            console.log('Decoded Swap event:', decodedEvent);
        }
    })
    .then(() => console.log('Subscription successful'))
    .catch((error) => console.error('Subscription failed:', error));
};

// Function to handle WebSocket connection errors and reconnect
const setupWebSocket = () => {
    const provider = web3.currentProvider;

    provider.on('error', (error) => {
        console.error('WebSocket error:', error);
        reconnect();
    });

    provider.on('end', () => {
        console.log('WebSocket connection closed. Reconnecting...');
        reconnect();
    });
};

const reconnect = () => {
    setTimeout(() => {
        console.log('Attempting to reconnect...');
        web3.setProvider(new Web3.providers.WebsocketProvider(ETHEREUM_WS_URL));
        setupWebSocket();
        subscription = subscribeToUniswapEvents();
    }, 5000);
};

setupWebSocket();
let subscription = subscribeToUniswapEvents();

// Handle script termination
process.on('SIGINT', () => {
    if (subscription) {
        subscription.unsubscribe((error, success) => {
            if (success) {
                console.log('Successfully unsubscribed');
            } else if (error) {
                console.error('Error unsubscribing:', error);
            }
            process.exit();
        });
    } else {
        process.exit();
    }
});

setInterval(() => {
    console.log('Still listening... Current time:', new Date().toISOString());
}, 10000);

console.log('Listening for Uniswap Swap events...');
