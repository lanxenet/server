<template>
	<div class="row">
		<div class="avatar"><img alt="" width="32" height="32" :src="generateAvatar(user.name, 32)" :srcset="generateAvatar(user.name, 64)+' 2x, '+generateAvatar(user.name, 128)+' 4x'"></div>
		<div class="name">{{user.name}}</div>
		<div class="displayName">
			<input :id="'displayName'+user.name+rand" type="text" :value="user.displayname" @input="updateDisplayName($event.target.value)"
					autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" />
			<label :for="'displayName'+user.name+rand" class="icon-rename" :title="t('settings', 'Change display name')"></label>
		</div>
		<div class="password">
			<input :id="'password'+user.name+rand" type="password" placeholder="●●●●●●●●●●" value=""
					autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" />
			<label :for="'password'+user.name+rand" class="icon-rename" :title="t('settings', 'Change password')"></label>
		</div>
		<div class="mailAddress">
			<input :id="'mailAddress'+user.name+rand" type="text" :value="user.email" @input="updateEmail($event.target.value)"
					autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" />
			<label :for="'mailAddress'+user.name+rand" class="icon-rename" :title="t('settings', 'Change email address')"></label>
		</div>
		<div class="groups">
			<multiselect :value="userGroups" :options="groups"
						 tag-placeholder="create" :placeholder="t('settings', 'Add user in group')"
						 label="name" track-by="id" class="multiselect-vue"
						 :multiple="true" :taggable="true" :close-on-select="false"
						 @tag="createGroup" @input="setUserGroups">
			</multiselect>
		</div>
		<div class="subadmins" v-if="subAdminsGroups.length>0">
			<multiselect :value="userSubAdminsGroups" :options="subAdminsGroups"
						 :placeholder="t('settings', 'Set user as admin for')"
						 label="name" track-by="id" class="multiselect-vue"
						 :multiple="true" :close-on-select="false"
						 @input="setUserSubAdminsGroups">
				<span slot="noResult">{{t('settings','No result')}}</span>
			</multiselect>
		</div>
		<div v-if="settings.recoveryAdminEnabled" ></div>
		<div class="quota">
			<multiselect :value="userQuota" :options="quotaOptions"
						 tag-placeholder="create" :placeholder="t('settings', 'Select user quota')"
						 label="label" track-by="id" class="multiselect-vue"
						 :allowEmpty="false" :taggable="true"
						 @tag="validateQuota" @input="setUserQuota">
			</multiselect>
			<progress class="quota-user-progress" :class="{'warn':usedQuota>80}" :value="usedQuota" max="100"></progress>
		</div>
		<div class="storageLocation">{{user.storageLocation}}</div>
		<div class="userBackend">{{user.backend}}</div>
		<div class="lastLogin">{{OC.Util.relativeModifiedDate(user.lastLogin)}}</div>
		<div class="userActions">
			<div class="toggleUserActions" v-if="OC.currentUser !== user.name && user.name !== 'admin'">
				<div class="icon-more" v-click-outside="hideMenu" @click="showMenu"></div>
				<div class="popovermenu" :class="{ 'open': openedMenu }">
					<popover-menu :menu="userActions"/>
				</div>
			</div>
		</div>
		</div>
</template>

<script>
import popoverMenu from '../popoverMenu';
import ClickOutside from 'vue-click-outside';
import Multiselect from 'vue-multiselect';
import Vuelidate from 'vuelidate';
import _ from 'lodash';

export default {
	name: 'userRow',
	props: ['user', 'settings', 'groups', 'subAdminsGroups', 'quotaOptions'],
	components: {
		Vuelidate,
		popoverMenu,
		Multiselect
	},
	directives: {
		ClickOutside
	},
	mounted() {
		// prevent click outside event with popupItem.
		this.popupItem = this.$el;
	},
	data() {
		return {
			rand: parseInt(Math.random() * 1000),
			openedMenu: false
		}
	},
	validations() {
		return {
			userQuota: {
				name: {
					[this.user.quota]: minLength(12)
				}
			},
		};
	},
	computed: {
		/* USER POPOVERMENU ACTIONS */
		userActions() {
			return [{
				icon: 'icon-delete',
				text: t('settings','Delete user'),
				action: 'deleteUser',
				data: this.user.name
			},{
				'icon': this.user.isEnabled ? 'icon-close' : 'icon-add',
				'text': this.user.isEnabled ? t('settings','Disable user') : t('settings','Enable user'),
				'action': 'enableDisableUser',
				data: {name: this.user.name, enabled: !this.user.isEnabled}
			}]
		},

		/* GROUPS MANAGEMENT */
		userGroups() {
			let userGroups = this.groups.filter(group => this.user.groups.includes(group.id));
			return userGroups;
		},
		userSubAdminsGroups() {
			let userSubAdminsGroups = this.subAdminsGroups.filter(group => this.user.subadmin.includes(group.id));
			return userSubAdminsGroups;
		},

		/* QUOTA MANAGEMENT */
		usedQuota() {
			let quota = OC.Util.computerFileSize(this.user.quota);
			if (quota > 0) {
				quota = Math.min(100, Math.round(this.user.size / quota * 100));
			} else {
				var usedInGB = this.user.size / (10 * Math.pow(2, 30));
				//asymptotic curve approaching 50% at 10GB to visualize used stace with infinite quota
				quota = 95 * (1 - (1 / (usedInGB + 1)));
			}
			return isNaN(quota) ? 0 : quota;
		},
		// Mapping saved values to objects
		userQuota() {
			if (OC.Util.computerFileSize(this.user.quota) === null) {
				return this.quotaOptions[0]; // illimited by default
			}
			// if value is valid, let's map the quotaOptions or return custom quota
			let userQuota = this.quotaOptions.find(quota => quota.id === this.user.quota);
			return userQuota ? userQuota : {id:this.user.quota, label:this.user.quota}; // unlimited
		},
	},
	methods: {
		/* MENU HANDLING */
		showMenu () {
			this.openedMenu = true;
		},
		hideMenu () {
			this.openedMenu = false;
		},

		/* AVATAR URL GENERATION */
		generateAvatar(user, size) {
			return OC.generateUrl(
				'/avatar/{user}/{size}?v={version}',
				{
					user: user,
					size: size,
					version: oc_userconfig.avatar.version
				}
			);
		},

		/* EMAIL PASSWORD DISPLAYNAME*/
		// debounce at 500, only one request per 500ms
		updateDisplayName: _.debounce(function(displayName) {
			this.$store.dispatch('setUserData', {
				name: this.user.name, 
				key:'displayname',
				value: displayName
			})
		}, 500),
		updateEmail: _.debounce(function(mailAddress) {
			this.$store.dispatch('setUserData', {
				name: this.user.name,
				key:'email',
				value: mailAddress
			})
		}, 500),

		/* GROUPS MANAGEMENT */
		createGroup(gid) {
			this.$store.commit('createGroup', gid);
			return this.$store.getters.getGroups[this.groups.length];
		},
		setUserGroups(groups) {
			if (Array.isArray(groups) && groups.length > 0) {
				groups = groups.map(group => group.id); // convert objects into array
				let name = this.user.name;
				return this.$store.dispatch('setUserGroups', {name, groups});
			}
			return false;
		},
		setUserSubAdminsGroups(groups) {
			if (Array.isArray(groups) && groups.length > 0) {
				groups = groups.map(group => group.id); // convert objects into array
				let name = this.user.name;
				return this.$store.commit('setUserSubAdminsGroups', {name, groups});
			}
			return false;
		},

		/* QUOTA MANAGEMENT */
		setUserQuota(quota) {
			let name = this.user.name;
			// ensure we only send the preset id
			quota = quota.id ? quota.id : quota;
			this.$store.dispatch('setUserData', {
				name: this.user.name, 
				key: 'quota',
				value: quota
			})
			return quota;
		},
		validateQuota(quota) {
			// only used for new presets sent through @Tag
			let validQuota = OC.Util.computerFileSize(quota);
			if (validQuota === 0) {
				return this.setUserQuota('none');
			} else if (validQuota !== null) {
				// unify format output
				return this.setUserQuota(OC.Util.humanFileSize(OC.Util.computerFileSize(quota)));
			}
			return this.commit('setUserQuota', {name, quota});
		}
	}
}
</script>
