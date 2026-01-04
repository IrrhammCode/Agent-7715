const kit = require('@metamask/smart-accounts-kit');
console.log(Object.keys(kit));
try {
    const actions = require('@metamask/smart-accounts-kit/actions');
    console.log('Actions:', Object.keys(actions));
} catch (e) {
    console.log('No actions submodule');
}
