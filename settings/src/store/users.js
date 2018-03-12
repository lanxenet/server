import api from './api';

const state = {
    users: [],
    groups: [],
    loading: false
};

const mutations = {
    setUsers(state, users) {
        state.users = users;
    },
    initGroups(state, groups) {
        state.groups = groups;
    },
    createGroup(state, groupid) {
        try {
            state.groups.push({
                id: groupid,
                name: groupid,
                usercount: 0 // user will be added after the creation
            });
        } catch (e) {
            console.log('Can\'t create group', e);
        }
    },
    addUserGroup(state, { name, gid }) {
        // this should not be needed as it would means the user contains a group
        // the server database doesn't have.
        let group = state.groups.find(groupSearch => groupSearch.id == gid);
        if (group) {
            group.usercount++; // increase count
        }
        let groups = state.users.find(user => user.name == name).groups;
        groups.push(gid);
    },
    removeUserGroup(state, { name, gid }) {
        // this should not be needed as it would means the user contains a group
        // the server database doesn't have.
        let group = state.groups.find(groupSearch => groupSearch.id == gid);
        if (group) {
            group.usercount--; // lower count
        }
        let groups = state.users.find(user => user.name == name).groups;
        let groupIndex = groups.indexOf(gid);
        if (groupIndex >= 0) {
            groups.splice(groupIndex, 1);
        }
    },
    setUserSubAdminsGroups(state, { name, groups }) {
        state.users.find(user => user.name == name).subadmin = groups;
    },
    deleteUser(state, name) {
        let userIndex = state.users.findIndex(user => user.name == name);
        state.users.splice(userIndex, 1);
    },
    enableDisableUser(state, { name, enabled }) {
        state.users.find(user => user.name == name).isEnabled = enabled;
        state.groups.find(group => group.id == '_disabledUsers').usercount += enabled ? -1 : 1;
    },
    setUserData(state, { name, key, value }) {
        state.users.find(user => user.name == name)[key] = value;
    }
};

const getters = {
    getUsers(state) {
        return state.users;
    },
    getGroups(state) {
        return state.groups;
    }
};

const actions = {
    getUsers(context, { offset, limit } = { offset: 0, limit: 25 }) {
        return api.get(OC.generateUrl('/settings/users/users?offset={offset}&limit={limit}', { offset, limit }))
            .then((response) => context.commit('setUsers', response.data))
            .catch((error) => context.commit('API_FAILURE', error));
    },
    setUserGroups({ dispatch, state }, { name, groups }) {
        let oldGroups = state.users.find(user => user.name == name).groups;
        // intersect the removed groups for the user
        let delGroups = oldGroups.filter(x => !groups.includes(x));
        // intersect the new groups for the user
        let addGroups = groups.filter(x => !oldGroups.includes(x));
        // change local data
        if (delGroups.length > 0) {
            delGroups.forEach((gid) => dispatch('removeUserGroup', { name, gid }));
        }
        if (addGroups.length > 0) {
            addGroups.forEach((gid) => dispatch('addUserGroup', { name, gid }));
        }
    },
    addUserGroup(context, { name, gid }) {
        let data = new FormData();
        data.append('groupid', gid);
        return api.requireAdmin().then((response) => {
            return api.post(OC.linkToOCS(`cloud/users/${name}/groups`, 2), data)
                .then((response) => context.commit('addUserGroup', { name, gid }))
                .catch((error) => context.commit('API_FAILURE', error));
        });
    },
    removeUserGroup(context, { name, gid }) {
        return api.requireAdmin().then((response) => {
            return api.delete(OC.linkToOCS(`cloud/users/${name}/groups`, 2), { groupid: gid })
                .then((response) => context.commit('removeUserGroup', { name, gid }))
                .catch((error) => context.commit('API_FAILURE', { name, error }));
        });
    },
    deleteUser(context, name) {
        context.commit('deleteUser', name);
        return api.requireAdmin().then((response) => {
            return api.delete(OC.linkToOCS(`cloud/users/${name}`, 2))
                .then((response) => context.commit('deleteUser', name))
                .catch((error) => context.commit('API_FAILURE', { name, error }));
        });
    },
    enableDisableUser(context, { name, enabled = true }) {
        let userStatus = enabled ? 'enable' : 'disable';
        return api.requireAdmin().then((response) => {
            return api.put(OC.linkToOCS(`cloud/users/${name}/${userStatus}`, 2))
                .then((response) => context.commit('enableDisableUser', { name, enabled }))
                .catch((error) => context.commit('API_FAILURE', { name, error }));
        });
    },

    /* SINGLE USER DATA */
    /* https://docs.nextcloud.com/server/{currentversion}/admin_manual/configuration_user/instruction_set_for_users.html#edit-data-of-a-single-user */
    setUserData(context, { name, key, value }) {
        if (['email', 'quota', 'displayname', 'password'].indexOf(key) >= 0) {
            if (typeof value === 'string' && value.length > 0) {
                return api.requireAdmin().then((response) => {
                    return api.put(OC.linkToOCS(`cloud/users/${name}`, 2), { key: key, value: value })
                        .then((response) => context.commit('setUserData', { name, key, value }))
                        .catch((error) => context.commit('API_FAILURE', { name, error }));
                });
            }
        }
        return Promise.reject(new Error('Invalid request data'));
    }
};

export default { state, mutations, getters, actions };