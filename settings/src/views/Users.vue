<template>
	<div id="app">
		<app-navigation :menu="menu" />
		<user-list :users="users" />
	</div>
</template>

<script>
import appNavigation from '../components/appNavigation';
import userList from '../components/userList';
import Vue from 'vue';

export default {
	name: 'Users',
	components: {
		appNavigation,
		userList
	},
	beforeMount() {
		this.$store.commit('initGroups', this.$store.getters.getServerData.groups);
		this.$store.dispatch('getUsers');
	},
	computed: {
		users() {
			return this.$store.getters.getUsers;
		},
		loading() {
			return Object.keys(this.users).length === 0;
		},
		menu() {
			// Data provided php side
			let groups = this.$store.getters.getGroups;
			groups = Array.isArray(groups) ? groups : [];

			// Map groups
			groups = groups.map(group => {
				let item = {};
				item.id = group.id.replace(' ', '_');
				item.classes = [];
				item.href = '#'+group.id.replace(' ', '_');
				item.text = group.name;
				item.utils = {counter: group.usercount};
				return item;
			});

			// Adjust data
			if (groups[0].id === 'admin') {
				groups[0].text = t('settings', 'Admins');}			// rename admin group
			if (groups[1].id === '_disabledUsers') {
				groups[1].text = t('settings', 'Disabled users');	// rename disabled group
				if (groups[1].utils.counter === 0) {
					groups.splice(1, 1);							// remove disabled if empty
				}
			}

			// Add everyone group
			groups.unshift({
				id: '_everyoneGroup',
				classes: ['active'],
				href:'#_everyoneGroup',
				text: t('settings', 'Everyone'),
				utils: {counter: this.users.length}
			});

			// Return
			return {
				id: 'usergrouplist',
				new: {
					text: t('settings','New user'),
					icon: 'icon-add'
				},
				items: groups
			}
		}
	}
}
</script>

<style lang="scss">
</style>
