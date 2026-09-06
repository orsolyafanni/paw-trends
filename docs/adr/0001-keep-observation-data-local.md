# Keep observation data local to the browser

Paw Trends will be deployed as an owner-only ChatGPT Site, but all Owner and Dog observations will remain in IndexedDB on the device and will never be sent to an application backend. This protects sensitive personal data and avoids accounts or synchronization in v1, at the cost of tying data to one browser and Site origin; persistent-storage requests plus explicit JSON backup and restore reduce, but do not remove, the risk of local data loss.
