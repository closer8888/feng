<?php 
	/**
	 * Feng2 Plugin update engine 
	 */
	function mail_update_1_2() {
		DB::execute("UPDATE ".TABLE_PREFIX."tab_panels SET type = 'plugin', plugin_id = (SELECT id FROM ".TABLE_PREFIX."plugins WHERE name='mail') WHERE id='mails-panel'");
	}
	
	function mail_update_2_3() {
		DB::execute("CREATE TABLE IF NOT EXISTS `".TABLE_PREFIX."mail_spam_filters` (
		  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
		  `account_id` int(10) unsigned NOT NULL,
		  `text_type` enum('email_address','subject') COLLATE utf8_unicode_ci NOT NULL,
		  `text` text COLLATE utf8_unicode_ci NOT NULL,
		  `spam_state` enum('no spam','spam') COLLATE utf8_unicode_ci NOT NULL,
		  PRIMARY KEY (`id`)
		) ENGINE = InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;");
	}
	
	function mail_update_3_4() {
		// config option to remember columns on mail list
		DB::execute("
				INSERT INTO ".TABLE_PREFIX."contact_config_options (`category_name`, `name`, `default_value`, `config_handler_class`, `is_system`, `option_order`, `dev_comment`) VALUES
				('mails panel', 'folder_received_columns', 'from,subject,account,date,folder,actions', 'StringConfigHandler', 0, 0, NULL),
 				('mails panel', 'folder_sent_columns', 'to,subject,account,date,folder,actions', 'StringConfigHandler', 0, 0, NULL),
				('mails panel', 'folder_draft_columns', 'to,subject,account,date,folder,actions', 'StringConfigHandler', 0, 0, NULL),
				('mails panel', 'folder_junk_columns', 'from,subject,account,date,folder,actions', 'StringConfigHandler', 0, 0, NULL),
				('mails panel', 'folder_outbox_columns', 'to,subject,account,date,folder,actions', 'StringConfigHandler', 0, 0, NULL)
				ON DUPLICATE KEY UPDATE name = name;
				");
	}